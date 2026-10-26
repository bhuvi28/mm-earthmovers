const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
if (!match) {
  console.error('No DATABASE_URL found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const visitors = await pool.query('SELECT count(*) FROM analytics_visitors');
    const sessions = await pool.query('SELECT count(*) FROM analytics_sessions');
    const events = await pool.query('SELECT count(*) FROM analytics_events');
    console.log('Visitors count:', visitors.rows[0].count);
    console.log('Sessions count:', sessions.rows[0].count);
    console.log('Events count:', events.rows[0].count);

    const latestVisitors = await pool.query('SELECT visitor_id, first_seen_at, last_seen_at, city, country, browser, os, identified_name FROM analytics_visitors ORDER BY last_seen_at DESC LIMIT 5');
    console.log('Latest visitors:', JSON.stringify(latestVisitors.rows, null, 2));

    const latestEvents = await pool.query('SELECT id, visitor_id, event_type, page_path, element_text, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 10');
    console.log('Latest events:', JSON.stringify(latestEvents.rows, null, 2));
  } catch (e) {
    console.error('Error querying DB:', e);
  } finally {
    await pool.end();
  }
}

main();
