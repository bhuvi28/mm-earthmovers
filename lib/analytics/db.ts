import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[DB Error] DATABASE_URL environment variable is missing.');
      throw new Error('DATABASE_URL environment variable is missing.');
    }

    // Strip outer quotes and whitespace if copied from env templates
    connectionString = connectionString.replace(/^["']|["']$/g, '').trim();

    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[DB Pool Error]', err);
    });
  }

  return pool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const p = getDbPool();
  const res = await p.query(text, params);
  return res.rows as T[];
}

export interface IngestPayload {
  visitorId: string;
  sessionId: string;
  eventType: string;
  pagePath: string;
  pageTitle?: string;
  elementText?: string;
  elementTarget?: string;
  elementTag?: string;
  metadata?: Record<string, any>;
  clientMeta?: {
    deviceType?: string;
    browser?: string;
    os?: string;
    screenResolution?: string;
    language?: string;
    timezone?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface GeoLocation {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

/**
 * Ingest an incoming batch of tracking events from a visitor session.
 */
export async function ingestEvents(
  events: IngestPayload[],
  geo: GeoLocation,
  serverParsedMeta: { deviceType?: string; browser?: string; os?: string }
) {
  if (!events || events.length === 0) return;

  const firstEvent = events[0];
  const { visitorId, sessionId, clientMeta } = firstEvent;

  const deviceType = clientMeta?.deviceType || serverParsedMeta.deviceType || 'desktop';
  const browser = clientMeta?.browser || serverParsedMeta.browser || 'unknown';
  const os = clientMeta?.os || serverParsedMeta.os || 'unknown';

  const p = getDbPool();
  const client = await p.connect();

  try {
    await client.query('BEGIN');

    // 1. Upsert Visitor
    await client.query(
      `
      INSERT INTO analytics_visitors (
        visitor_id, first_seen_at, last_seen_at, total_sessions,
        country, country_code, region, city,
        device_type, browser, os, screen_resolution, language, timezone
      )
      VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (visitor_id) DO UPDATE SET
        last_seen_at = CURRENT_TIMESTAMP,
        country = COALESCE(analytics_visitors.country, EXCLUDED.country),
        country_code = COALESCE(analytics_visitors.country_code, EXCLUDED.country_code),
        region = COALESCE(analytics_visitors.region, EXCLUDED.region),
        city = COALESCE(analytics_visitors.city, EXCLUDED.city),
        device_type = COALESCE(EXCLUDED.device_type, analytics_visitors.device_type),
        browser = COALESCE(EXCLUDED.browser, analytics_visitors.browser),
        os = COALESCE(EXCLUDED.os, analytics_visitors.os),
        screen_resolution = COALESCE(EXCLUDED.screen_resolution, analytics_visitors.screen_resolution);
      `,
      [
        visitorId,
        geo.country || null,
        geo.countryCode || null,
        geo.region || null,
        geo.city || null,
        deviceType,
        browser,
        os,
        clientMeta?.screenResolution || null,
        clientMeta?.language || null,
        clientMeta?.timezone || null,
      ]
    );

    // 2. Upsert Session
    const referrer = clientMeta?.referrer || null;
    const utmSource = clientMeta?.utmSource || null;
    const utmMedium = clientMeta?.utmMedium || null;
    const utmCampaign = clientMeta?.utmCampaign || null;

    await client.query(
      `
      INSERT INTO analytics_sessions (
        session_id, visitor_id, started_at, last_active_at,
        entry_page, exit_page, referrer,
        utm_source, utm_medium, utm_campaign,
        device_type, country, city
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $3, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (session_id) DO UPDATE SET
        last_active_at = CURRENT_TIMESTAMP,
        exit_page = EXCLUDED.exit_page,
        duration_seconds = GREATEST(0, ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - analytics_sessions.started_at))));
      `,
      [
        sessionId,
        visitorId,
        firstEvent.pagePath,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        deviceType,
        geo.country || null,
        geo.city || null,
      ]
    );

    // 3. Process each event (and handle identity updates if event is 'identify' or form submission)
    for (const ev of events) {
      if (ev.eventType === 'identify' || ev.eventType === 'form_submit') {
        const name = ev.metadata?.name;
        const contact = ev.metadata?.contact || ev.metadata?.email || ev.metadata?.phone;
        if (name || contact) {
          await client.query(
            `
            UPDATE analytics_visitors
            SET identified_name = COALESCE($1, identified_name),
                identified_contact = COALESCE($2, identified_contact)
            WHERE visitor_id = $3
            `,
            [name || null, contact || null, visitorId]
          );
        }
      }

      await client.query(
        `
        INSERT INTO analytics_events (
          visitor_id, session_id, event_type,
          page_path, page_title, element_text, element_target, element_tag, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          visitorId,
          sessionId,
          ev.eventType,
          ev.pagePath,
          ev.pageTitle || null,
          ev.elementText || null,
          ev.elementTarget || null,
          ev.elementTag || null,
          ev.metadata ? JSON.stringify(ev.metadata) : null,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
