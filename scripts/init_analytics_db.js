const { Pool } = require('pg');
require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = require('fs').readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match) {
  console.error('Could not find DATABASE_URL in .env.local');
  process.exit(1);
}

const connectionString = match[1];

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

    console.log('Initializing schema...');
    const createTablesSql = `
      -- 1. Visitors Table
      CREATE TABLE IF NOT EXISTS analytics_visitors (
        visitor_id VARCHAR(64) PRIMARY KEY,
        first_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        total_sessions INT DEFAULT 1,
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
        identified_contact VARCHAR(128)
      );

      -- 2. Sessions Table
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        session_id VARCHAR(64) PRIMARY KEY,
        visitor_id VARCHAR(64) REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        entry_page TEXT,
        exit_page TEXT,
        duration_seconds INT DEFAULT 0,
        referrer TEXT,
        utm_source VARCHAR(128),
        utm_medium VARCHAR(128),
        utm_campaign VARCHAR(128),
        device_type VARCHAR(32),
        country VARCHAR(64),
        city VARCHAR(64)
      );

      -- 3. Events Table
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        visitor_id VARCHAR(64) REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
        session_id VARCHAR(64),
        event_type VARCHAR(64) NOT NULL,
        page_path TEXT NOT NULL,
        page_title TEXT,
        element_text TEXT,
        element_target TEXT,
        element_tag VARCHAR(32),
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_visitor_id ON analytics_events(visitor_id);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON analytics_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON analytics_sessions(last_active_at DESC);
      CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON analytics_visitors(last_seen_at DESC);
    `;

    await pool.query(createTablesSql);
    console.log('All analytics tables and indexes created successfully!');
  } catch (err) {
    console.error('Error connecting or migrating:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
