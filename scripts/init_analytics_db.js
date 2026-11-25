const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function resolveConnectionString() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match) {
        connectionString = match[1];
      }
    }
  }

  if (!connectionString) {
    console.error('Could not find DATABASE_URL in environment or .env.local');
    process.exit(1);
  }

  connectionString = connectionString.replace(/^["']|["']$/g, '').trim();

  if (connectionString.includes('db.ueojvtnxtilbtolhcuhu.supabase.co')) {
    connectionString = connectionString
      .replace('db.ueojvtnxtilbtolhcuhu.supabase.co', 'aws-0-ap-southeast-2.pooler.supabase.com')
      .replace('postgres:', 'postgres.ueojvtnxtilbtolhcuhu:')
      .replace(':5432', ':6543');
  }

  return connectionString;
}

const connectionString = resolveConnectionString();

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const testRes = await pool.query('SELECT NOW() as current_time, version()');
    console.log('Connection successful!');
    console.log('Database time:', testRes.rows[0].current_time);
    console.log('PostgreSQL version:', testRes.rows[0].version);

    console.log('Running idempotent analytics schema migration & backfill...');
    const migrationSql = `
      -- ============================================================
      -- 1. EXISTING TABLES RECONCILIATION (BUG-12 & SEC-03)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS analytics_visitors (
        visitor_id VARCHAR(64) PRIMARY KEY,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_sessions INT NOT NULL DEFAULT 1,
        country VARCHAR(64),
        country_code VARCHAR(8),
        region VARCHAR(64),
        city VARCHAR(64),
        device_type VARCHAR(32),
        browser VARCHAR(64),
        os VARCHAR(64),
        screen_resolution VARCHAR(32),
        language VARCHAR(32),
        timezone VARCHAR(64),
        identified_name VARCHAR(128),
        identified_contact VARCHAR(128),
        ip_address VARCHAR(64)
      );
      ALTER TABLE analytics_visitors ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

      CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        visitor_id VARCHAR(64) NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        entry_page TEXT,
        exit_page TEXT,
        duration_seconds INT NOT NULL DEFAULT 0,
        referrer TEXT,
        utm_source VARCHAR(128),
        utm_medium VARCHAR(128),
        utm_campaign VARCHAR(128),
        device_type VARCHAR(32),
        country VARCHAR(64),
        city VARCHAR(64)
      );

      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        visitor_id VARCHAR(64) NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
        session_id VARCHAR(64),
        event_type VARCHAR(64) NOT NULL,
        page_path TEXT NOT NULL,
        page_title TEXT,
        element_text TEXT,
        element_target TEXT,
        element_tag VARCHAR(32),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(64)
      );
      ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

      CREATE TABLE IF NOT EXISTS analytics_restrictions (
        id BIGSERIAL PRIMARY KEY,
        type VARCHAR(16) NOT NULL CHECK (type IN ('ip', 'visitor_id')),
        value VARCHAR(128) NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      -- Enforce case-insensitive uniqueness on analytics_restrictions.value
      ALTER TABLE analytics_restrictions DROP CONSTRAINT IF EXISTS analytics_restrictions_value_key;
      DROP INDEX IF EXISTS analytics_restrictions_value_key;
      DELETE FROM analytics_restrictions
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(value)) ORDER BY id DESC) AS rn
          FROM analytics_restrictions
        ) dup
        WHERE dup.rn > 1
      );
      UPDATE analytics_restrictions SET value = LOWER(TRIM(value)) WHERE value <> LOWER(TRIM(value));
      CREATE UNIQUE INDEX IF NOT EXISTS idx_restrictions_value_lower ON analytics_restrictions (LOWER(value));

      CREATE TABLE IF NOT EXISTS analytics_flags (
        id BIGSERIAL PRIMARY KEY,
        target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('visitor_id', 'ip')),
        target_value VARCHAR(128) NOT NULL,
        flag_type VARCHAR(32) NOT NULL CHECK (flag_type IN ('competitor', 'scraper', 'nuisance', 'vip_buyer', 'suspicious')),
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (target_value, flag_type)
      );

      -- ============================================================
      -- 1B. HISTORICAL BACKFILL FOR BUG-01 (IDEMPOTENT)
      -- ============================================================
      UPDATE analytics_visitors v
      SET total_sessions = GREATEST(1, sub.cnt)
      FROM (
        SELECT visitor_id, COUNT(DISTINCT session_id) AS cnt
        FROM analytics_sessions
        GROUP BY visitor_id
      ) sub
      WHERE v.visitor_id = sub.visitor_id
        AND v.total_sessions <> GREATEST(1, sub.cnt);

      -- ============================================================
      -- 2. CRM, OPS & AUDIT TABLES (IDEMPOTENT SCHEMA ALIGNMENT)
      -- ============================================================
      CREATE TABLE IF NOT EXISTS analytics_leads (
        id BIGSERIAL PRIMARY KEY,
        lead_uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
        visitor_id VARCHAR(64) REFERENCES analytics_visitors(visitor_id) ON DELETE SET NULL,
        session_id VARCHAR(64),
        source VARCHAR(32) NOT NULL CHECK (source IN ('contact_form', 'targeted_modal', 'manual')),
        placement VARCHAR(64),
        name VARCHAR(128),
        company VARCHAR(128),
        contact VARCHAR(128) NOT NULL,
        message TEXT,
        product_slug VARCHAR(128),
        part_number VARCHAR(128),
        machine_slug VARCHAR(64),
        search_query VARCHAR(256),
        status VARCHAR(24) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'won', 'lost', 'spam')),
        estimated_value_inr NUMERIC(12, 2),
        delivery_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'fallback_sent', 'failed', 'not_applicable')),
        external_provider VARCHAR(32),
        external_ref VARCHAR(128),
        ip_address VARCHAR(64),
        country VARCHAR(64),
        city VARCHAR(64),
        notes TEXT,
        first_responded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics_lead_events (
        id BIGSERIAL PRIMARY KEY,
        lead_id BIGINT NOT NULL REFERENCES analytics_leads(id) ON DELETE CASCADE,
        actor VARCHAR(64) NOT NULL DEFAULT 'admin',
        event_kind VARCHAR(32) NOT NULL CHECK (event_kind IN ('created', 'status_change', 'note_added', 'quote_updated', 'delivery_attempt')),
        old_value TEXT,
        new_value TEXT,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics_ops_metrics (
        id BIGSERIAL PRIMARY KEY,
        metric_kind VARCHAR(32) NOT NULL CHECK (metric_kind IN ('ingest_batch', 'api_request', 'db_query', 'external_call', 'middleware_block', 'catalog_cache')),
        target_name VARCHAR(96) NOT NULL,
        status_code INT,
        outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('ok', 'rejected', 'timeout', 'error', 'blocked', 'cache_hit', 'cache_miss')),
        duration_ms INT NOT NULL DEFAULT 0,
        batch_size INT DEFAULT 1,
        error_code VARCHAR(64),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics_alert_deliveries (
        id BIGSERIAL PRIMARY KEY,
        dedupe_key VARCHAR(160) NOT NULL,
        visitor_id VARCHAR(64),
        session_id VARCHAR(64),
        heuristic_name VARCHAR(64),
        channel VARCHAR(32) NOT NULL CHECK (channel IN ('phone_push', 'email', 'webhook', 'console', 'mock')),
        outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('sent', 'failed', 'deduplicated')),
        http_status INT,
        latency_ms INT,
        error_message TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics_audit_logs (
        id BIGSERIAL PRIMARY KEY,
        actor_ip VARCHAR(64),
        actor_label VARCHAR(64) NOT NULL DEFAULT 'admin',
        action VARCHAR(64) NOT NULL,
        target_type VARCHAR(32),
        target_value VARCHAR(160),
        success BOOLEAN NOT NULL DEFAULT TRUE,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- ============================================================
      -- 3. INDEXES
      -- ============================================================
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON analytics_events(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_events_visitor_created ON analytics_events(visitor_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_session_id ON analytics_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_type_created ON analytics_events(event_type, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_ip_created ON analytics_events(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON analytics_sessions(last_active_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON analytics_sessions(started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_visitor_started ON analytics_sessions(visitor_id, started_at DESC);
      CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON analytics_visitors(last_seen_at DESC);
      CREATE INDEX IF NOT EXISTS idx_visitors_ip ON analytics_visitors(ip_address) WHERE ip_address IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_leads_status_created ON analytics_leads(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON analytics_leads(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_ops_kind_created ON analytics_ops_metrics(metric_kind, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_alert_dedupe_expires ON analytics_alert_deliveries(dedupe_key, expires_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON analytics_audit_logs(created_at DESC);
    `;

    await pool.query(migrationSql);
    console.log('All analytics tables, indexes, constraints, and backfills completed successfully!');
  } catch (err) {
    console.error('Error connecting or migrating:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
