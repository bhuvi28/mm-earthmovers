import { getDbPool } from './db';
import { withOpsMetric } from './ops';

/**
 * Immediate Zero-Cost Sentinel Alerting Dispatcher
 *
 * Supports:
 * 1. Phone Push via Topic/Code (ntfy.sh - 0 npm dependencies, 100% free forever, no signup required, instant mobile push)
 * 2. Email Alerting (via free REST email API / webhook)
 * 3. Generic Webhook (Discord / Slack / Generic HTTP POST)
 * 4. Offline Mock Mode (ALERT_TEST_MODE=true or ALERT_WEBHOOK_URL='mock')
 *
 * Guarantees:
 * - Native Node.js 18+ global fetch() with AbortSignal.timeout(2000)
 * - 0 paid external dependencies (no Twilio, SendGrid, paid WhatsApp/SMS)
 * - Persistent PostgreSQL + L1 alert deduplication (60-minute window) to prevent alert fatigue across cold starts
 * - Non-blocking execution for telemetry ingestion
 */

export interface SentinelAlertPayload {
  alertId?: string;
  eventType?: 'nuisance_detected' | 'competitor_flagged' | 'scraping_detected';
  timestamp?: string;
  sessionId: string;
  visitorId: string;
  ipAddress?: string | null;
  geo?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  };
  clientMeta?: {
    browser?: string;
    os?: string;
    deviceType?: string;
  };
  behavioralIndicators?: {
    durationSeconds?: number;
    pageCount?: number;
    copyEventsCount?: number;
    partCopiesCount?: number;
    rageClicksCount?: number;
    conversionClicksCount?: number;
    entryPage?: string;
    exitPage?: string;
  };
  flag?: {
    flagType: 'nuisance' | 'competitor' | 'scraper' | 'suspicious';
    heuristicName: string;
    reason: string;
    confidenceScore?: number;
  };
  actionTaken?: string;
  adminDashboardUrl?: string;
}

export type AlertDeliveryChannel = 'phone_push' | 'email' | 'webhook' | 'console' | 'mock';
export type AlertDeliveryOutcome = 'sent' | 'failed' | 'deduplicated';

export interface AlertDispatchResult {
  success: boolean;
  mode: 'phone_push' | 'email' | 'webhook' | 'discord' | 'slack' | 'telegram' | 'mock' | 'console' | 'none';
  channels?: string[];
  deduplicated?: boolean;
  error?: string;
  payload?: SentinelAlertPayload;
}

interface ChannelDispatchOutcome {
  channel: AlertDeliveryChannel;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
}

// In-memory deduplication cache: key -> timestamp (ms)
const alertDedupeCache = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60 * 60 * 1000; // 60 minutes

// In-memory store for test/mock mode
const mockAlertStore: SentinelAlertPayload[] = [];

/**
 * Retrieve alerts captured during mock/test mode
 */
export function getMockAlerts(): SentinelAlertPayload[] {
  return [...mockAlertStore];
}

/**
 * Clear mock alerts store (for test suites)
 */
export function clearMockAlerts(): void {
  mockAlertStore.length = 0;
}

/**
 * Clear deduplication cache (for test suites)
 */
export function clearDedupeCache(): void {
  alertDedupeCache.clear();
}

/**
 * Check and record alert deduplication (L1 in-memory)
 */
export function checkAndRecordDedupe(key: string, now = Date.now()): boolean {
  const lastTime = alertDedupeCache.get(key);
  if (lastTime && now - lastTime < DEDUPE_WINDOW_MS) {
    return true; // Already alerted recently
  }
  alertDedupeCache.set(key, now);

  // Evict stale entries if cache grows
  if (alertDedupeCache.size > 2000) {
    alertDedupeCache.forEach((v, k) => {
      if (now - v >= DEDUPE_WINDOW_MS) {
        alertDedupeCache.delete(k);
      }
    });
  }

  return false;
}

/**
 * Persistent PostgreSQL-backed alert deduplication check with L1 fast-path and non-fatal fallback.
 */
export async function checkAndRecordDedupeDb(
  dedupeKey: string,
  windowMs: number = DEDUPE_WINDOW_MS
): Promise<boolean> {
  const now = Date.now();
  const cleanKey = dedupeKey.slice(0, 160);
  const lastTime = alertDedupeCache.get(cleanKey);
  if (lastTime && now - lastTime < windowMs) {
    return true;
  }

  try {
    if (process.env.DATABASE_URL) {
      const pool = getDbPool();
      const res = await pool.query(
        `SELECT 1 FROM analytics_alert_deliveries WHERE dedupe_key = $1 AND expires_at > NOW() LIMIT 1`,
        [cleanKey]
      );
      if (res.rows.length > 0) {
        alertDedupeCache.set(cleanKey, now);
        return true;
      }
    }
  } catch {
    // Non-fatal fallback to L1 cache when DB is unavailable
  }

  alertDedupeCache.set(cleanKey, now);
  if (alertDedupeCache.size > 2000) {
    alertDedupeCache.forEach((v, k) => {
      if (now - v >= windowMs) {
        alertDedupeCache.delete(k);
      }
    });
  }

  return false;
}

async function hasActiveVisitorAlertDb(visitorId?: string | null): Promise<boolean> {
  if (!visitorId || !process.env.DATABASE_URL) return false;
  try {
    const pool = getDbPool();
    const res = await pool.query(
      `SELECT 1 FROM analytics_alert_deliveries WHERE visitor_id = $1 AND outcome IN ('sent', 'failed') AND expires_at > NOW() LIMIT 1`,
      [visitorId.slice(0, 64)]
    );
    return res.rows.length > 0;
  } catch {
    return false;
  }
}

function normalizeChannel(channel: string): AlertDeliveryChannel {
  if (channel === 'phone_push' || channel === 'email' || channel === 'webhook' || channel === 'console' || channel === 'mock') {
    return channel;
  }
  if (channel === 'discord' || channel === 'slack' || channel === 'telegram') {
    return 'webhook';
  }
  return 'console';
}

async function logAlertDelivery(entry: {
  dedupeKey: string;
  visitorId?: string | null;
  sessionId?: string | null;
  heuristicName?: string | null;
  channel: AlertDeliveryChannel;
  outcome: AlertDeliveryOutcome;
  httpStatus?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  windowMs?: number;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const pool = getDbPool();
    const ttlMs = Math.max(1000, Math.round(entry.windowMs ?? DEDUPE_WINDOW_MS));
    const expiresAt = new Date(Date.now() + ttlMs);
    await pool.query(
      `
      INSERT INTO analytics_alert_deliveries (
        dedupe_key, visitor_id, session_id, heuristic_name,
        channel, outcome, http_status, latency_ms, error_message, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        entry.dedupeKey.slice(0, 160),
        entry.visitorId ? entry.visitorId.slice(0, 64) : null,
        entry.sessionId ? entry.sessionId.slice(0, 64) : null,
        entry.heuristicName ? entry.heuristicName.slice(0, 64) : null,
        normalizeChannel(entry.channel),
        entry.outcome,
        typeof entry.httpStatus === 'number' && Number.isFinite(entry.httpStatus)
          ? Math.round(entry.httpStatus)
          : null,
        typeof entry.latencyMs === 'number' && Number.isFinite(entry.latencyMs)
          ? Math.max(0, Math.round(entry.latencyMs))
          : null,
        entry.errorMessage ? entry.errorMessage.slice(0, 500) : null,
        expiresAt,
      ]
    );
  } catch {
    // Non-fatal: alert delivery logging must never break alert dispatch
  }
}

/**
 * Format plain text summary for phone push / email
 */
function formatAlertSummary(payload: SentinelAlertPayload): string {
  const location = [payload.geo?.city, payload.geo?.region, payload.geo?.country].filter(Boolean).join(', ') || 'Unknown Location';
  const client = [payload.clientMeta?.browser, payload.clientMeta?.os, payload.clientMeta?.deviceType].filter(Boolean).join(' / ') || 'Unknown Client';
  const duration = payload.behavioralIndicators?.durationSeconds ?? 0;
  const copies = payload.behavioralIndicators?.partCopiesCount ?? payload.behavioralIndicators?.copyEventsCount ?? 0;
  const rageClicks = payload.behavioralIndicators?.rageClicksCount ?? 0;
  const conversions = payload.behavioralIndicators?.conversionClicksCount ?? 0;

  return [
    `🚨 SENTINEL ALERT: Nuisance Activity Flagged`,
    `Pattern: ${payload.flag?.heuristicName || 'krishnagiri_opera_nuisance'}`,
    `Reason: ${payload.flag?.reason || 'Mass part number harvesting with zero conversion inquiry'}`,
    `Location: ${location}`,
    `Client: ${client}`,
    `Dwell: ${duration}s | Part Copies: ${copies} | Rage Clicks: ${rageClicks} | Leads: ${conversions}`,
    `Session ID: ${payload.sessionId}`,
    `Visitor ID: ${payload.visitorId}`,
    `IP Address: ${payload.ipAddress || 'Not recorded'}`,
    `Action: ${payload.actionTaken || 'Recorded in analytics_flags. Zero automatic restrictions applied.'}`,
    `Review: ${payload.adminDashboardUrl || 'https://www.mmearthmovers.com/admin/analytics'}`,
  ].join('\n');
}

/**
 * Dispatch Phone Push via free ntfy.sh topic using JSON body to prevent ByteString header errors
 */
async function dispatchPhonePush(
  topic: string,
  payload: SentinelAlertPayload
): Promise<ChannelDispatchOutcome> {
  const cleanTopic = topic.trim().replace(/^https?:\/\/ntfy\.sh\//, '');
  const summary = formatAlertSummary(payload);
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
  const adminUrl = payload.adminDashboardUrl || 'https://www.mmearthmovers.com/admin/analytics';
  const startMs = Date.now();

  try {
    const res = await withOpsMetric(
      'external_call',
      'ntfy_sh',
      async () =>
        await fetch(server, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: cleanTopic,
            title: `🚨 Sentinel Alert: Nuisance Activity Flagged (${payload.geo?.city || 'Krishnagiri'})`,
            message: summary,
            priority: 4,
            tags: ['warning', 'rotating_light'],
            click: adminUrl,
            actions: [
              {
                action: 'view',
                label: 'Open Admin Dashboard',
                url: adminUrl,
              },
            ],
          }),
          signal: AbortSignal.timeout(2500),
        }),
      (r, err) => {
        if (err) {
          const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
          return {
            outcome: isTimeout ? 'timeout' : 'error',
            errorCode: err instanceof Error ? err.name.slice(0, 64) : 'error',
          };
        }
        return {
          statusCode: r?.status,
          outcome: r?.ok ? 'ok' : 'error',
          errorCode: r?.ok ? undefined : `http_${r?.status ?? 'err'}`,
        };
      }
    );

    return {
      channel: 'phone_push',
      ok: res.ok,
      statusCode: res.status,
      latencyMs: Date.now() - startMs,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.error('[Sentinel Phone Push Error]', err);
    return {
      channel: 'phone_push',
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - startMs,
      errorMessage: err?.message || 'Phone push request failed',
    };
  }
}

/**
 * Dispatch Email Alert via free HTTP email API (Resend / webhook)
 */
async function dispatchEmail(payload: SentinelAlertPayload): Promise<ChannelDispatchOutcome> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.ALERT_EMAIL_TO || 'hm.mmearthmovers@gmail.com';
  const startMs = Date.now();

  if (!apiKey) {
    return {
      channel: 'email',
      ok: false,
      statusCode: null,
      latencyMs: 0,
      errorMessage: 'RESEND_API_KEY missing',
    };
  }

  const summary = formatAlertSummary(payload);
  const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e; margin-top: 0;">🚨 Sentinel Alert: Nuisance Activity Flagged</h2>
        <p><strong>Heuristic:</strong> <code>${payload.flag?.heuristicName || 'krishnagiri_opera_nuisance'}</code></p>
        <p><strong>Reason:</strong> ${payload.flag?.reason || 'Mass part number harvesting'}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <ul style="line-height: 1.8;">
          <li><strong>Location:</strong> ${payload.geo?.city || 'Unknown'}, ${payload.geo?.country || ''}</li>
          <li><strong>Client:</strong> ${payload.clientMeta?.browser || 'Unknown'} / ${payload.clientMeta?.os || ''}</li>
          <li><strong>Duration:</strong> ${payload.behavioralIndicators?.durationSeconds || 0} seconds</li>
          <li><strong>Part Copies:</strong> ${payload.behavioralIndicators?.partCopiesCount ?? payload.behavioralIndicators?.copyEventsCount ?? 0}</li>
          <li><strong>Lead Actions:</strong> ${payload.behavioralIndicators?.conversionClicksCount || 0}</li>
          <li><strong>Session ID:</strong> <code>${payload.sessionId}</code></li>
          <li><strong>Visitor ID:</strong> <code>${payload.visitorId}</code></li>
        </ul>
        <p style="background: #f7fafc; padding: 10px; border-left: 4px solid #4a5568; font-size: 14px;">
          <em>Action Taken:</em> Recorded in <code>analytics_flags</code>. Manual admin review required. Zero automatic restrictions applied.
        </p>
        <p style="margin-top: 20px;">
          <a href="${payload.adminDashboardUrl || 'https://www.mmearthmovers.com/admin/analytics'}" style="background: #3182ce; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Open Admin Dashboard
          </a>
        </p>
      </div>
    `;

  try {
    const res = await withOpsMetric(
      'external_call',
      'resend_email',
      async () =>
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'MM Earthmovers Sentinel <onboarding@resend.dev>',
            to: [recipient],
            subject: `🚨 Sentinel Alert: Nuisance Activity Flagged (${payload.geo?.city || 'Krishnagiri'})`,
            html: htmlBody,
            text: summary,
          }),
          signal: AbortSignal.timeout(2000),
        }),
      (r, err) => {
        if (err) {
          const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
          return {
            outcome: isTimeout ? 'timeout' : 'error',
            errorCode: err instanceof Error ? err.name.slice(0, 64) : 'error',
          };
        }
        return {
          statusCode: r?.status,
          outcome: r?.ok ? 'ok' : 'error',
          errorCode: r?.ok ? undefined : `http_${r?.status ?? 'err'}`,
        };
      }
    );

    return {
      channel: 'email',
      ok: res.ok,
      statusCode: res.status,
      latencyMs: Date.now() - startMs,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.error('[Sentinel Email Error]', err);
    return {
      channel: 'email',
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - startMs,
      errorMessage: err?.message || 'Email request failed',
    };
  }
}

/**
 * Dispatch Webhook Alert (Generic, Discord, or Slack)
 */
async function dispatchWebhook(
  webhookUrl: string,
  payload: SentinelAlertPayload
): Promise<ChannelDispatchOutcome> {
  let body: any;
  const startMs = Date.now();

  if (webhookUrl.includes('discord.com/api/webhooks')) {
    body = {
      username: 'MM Earthmovers Sentinel',
      avatar_url: 'https://www.mmearthmovers.com/favicon.ico',
      embeds: [
        {
          title: '🚨 Sentinel Alert: Nuisance Activity Flagged',
          description: `**Heuristic:** \`${payload.flag?.heuristicName || 'behavioral_flag'}\`\n**Reason:** ${payload.flag?.reason || 'Suspicious behavioral pattern detected'}`,
          color: 15158332,
          fields: [
            { name: '📍 Location', value: [payload.geo?.city, payload.geo?.region, payload.geo?.country].filter(Boolean).join(', ') || 'Unknown', inline: true },
            { name: '🌐 Client', value: `${payload.clientMeta?.browser || 'Unknown'} / ${payload.clientMeta?.os || 'Unknown'}`, inline: true },
            { name: '⏱️ Dwell Time', value: `${payload.behavioralIndicators?.durationSeconds || 0}s`, inline: true },
            { name: '📋 Part Copies', value: `${payload.behavioralIndicators?.partCopiesCount ?? payload.behavioralIndicators?.copyEventsCount ?? 0} copied`, inline: true },
            { name: '⚡ Rage Clicks', value: `${payload.behavioralIndicators?.rageClicksCount || 0} rage clicks`, inline: true },
            { name: '📞 Conversions', value: `${payload.behavioralIndicators?.conversionClicksCount || 0} actions`, inline: true },
            { name: '🆔 Session ID', value: `\`${payload.sessionId}\``, inline: false },
            { name: '👤 Visitor ID', value: `\`${payload.visitorId}\``, inline: false },
            { name: '🛡️ Policy Status', value: payload.actionTaken || 'Recorded in `analytics_flags`. Manual review required.', inline: false },
          ],
          url: payload.adminDashboardUrl || 'https://www.mmearthmovers.com/admin/analytics',
          timestamp: payload.timestamp || new Date().toISOString(),
          footer: { text: 'MM Earthmovers Sentinel Monitoring System' },
        },
      ],
    };
  } else if (webhookUrl.includes('hooks.slack.com')) {
    body = {
      text: `🚨 *Sentinel Alert: Nuisance Activity Flagged*\n*Reason:* ${payload.flag?.reason}\n*Session:* \`${payload.sessionId}\`\n*Location:* ${payload.geo?.city || 'Unknown'}\n*Action:* Recorded in \`analytics_flags\``,
    };
  } else {
    body = {
      event: 'sentinel_alert',
      alert: payload,
    };
  }

  try {
    const res = await withOpsMetric(
      'external_call',
      'alert_webhook',
      async () =>
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        }),
      (r, err) => {
        if (err) {
          const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
          return {
            outcome: isTimeout ? 'timeout' : 'error',
            errorCode: err instanceof Error ? err.name.slice(0, 64) : 'error',
          };
        }
        return {
          statusCode: r?.status,
          outcome: r?.ok ? 'ok' : 'error',
          errorCode: r?.ok ? undefined : `http_${r?.status ?? 'err'}`,
        };
      }
    );

    return {
      channel: 'webhook',
      ok: res.ok,
      statusCode: res.status,
      latencyMs: Date.now() - startMs,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    console.error('[Sentinel Webhook Error]', err);
    return {
      channel: 'webhook',
      ok: false,
      statusCode: null,
      latencyMs: Date.now() - startMs,
      errorMessage: err?.message || 'Webhook request failed',
    };
  }
}

/**
 * Main immediate alert dispatcher
 */
export async function dispatchAlert(
  payload: SentinelAlertPayload,
  options?: { force?: boolean; mock?: boolean; persistMock?: boolean }
): Promise<AlertDispatchResult> {
  try {
    const isMock =
      options?.mock === true ||
      process.env.ALERT_TEST_MODE === 'true' ||
      process.env.ALERT_WEBHOOK_URL === 'mock';

    const flagType = payload.flag?.flagType || 'nuisance';
    const heuristicName = payload.flag?.heuristicName || null;
    const dedupeKey = `${payload.sessionId}:${flagType}`;
    const visitorDedupeKey = `${payload.visitorId}:${flagType}`;

    const phoneTopic = process.env.NTFY_TOPIC || process.env.PHONE_ALERT_CODE || process.env.ALERT_PHONE_TOPIC;
    const hasEmail = Boolean(process.env.RESEND_API_KEY || process.env.ALERT_EMAIL_TO);
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    const hasWebhook = Boolean(webhookUrl && webhookUrl !== 'mock');

    const configuredChannels: AlertDeliveryChannel[] = [];
    if (phoneTopic) configuredChannels.push('phone_push');
    if (hasEmail) configuredChannels.push('email');
    if (hasWebhook) configuredChannels.push('webhook');

    // Preserve L1-only dedupe in default mock mode so repeated test runs stay idempotent
    if (isMock && !options?.persistMock) {
      if (!options?.force) {
        if (checkAndRecordDedupe(dedupeKey) || checkAndRecordDedupe(visitorDedupeKey)) {
          return {
            success: true,
            mode: 'none',
            deduplicated: true,
            payload,
          };
        }
      }

      mockAlertStore.push(payload);
      return {
        success: true,
        mode: 'mock',
        payload,
      };
    }

    // 1. DB-backed deduplication check with L1 fast-path
    if (!options?.force) {
      const isDup =
        (await checkAndRecordDedupeDb(dedupeKey, DEDUPE_WINDOW_MS)) ||
        (await checkAndRecordDedupeDb(visitorDedupeKey, DEDUPE_WINDOW_MS)) ||
        (await hasActiveVisitorAlertDb(payload.visitorId));

      if (isDup) {
        const dedupeChannel: AlertDeliveryChannel =
          isMock ? 'mock' : configuredChannels[0] || 'console';
        await logAlertDelivery({
          dedupeKey,
          visitorId: payload.visitorId,
          sessionId: payload.sessionId,
          heuristicName,
          channel: dedupeChannel,
          outcome: 'deduplicated',
          latencyMs: 0,
        });
        return {
          success: true,
          mode: 'none',
          deduplicated: true,
          payload,
        };
      }
    }

    // 2. Persisted mock mode (used for deterministic DB verification tests)
    if (isMock) {
      mockAlertStore.push(payload);
      await logAlertDelivery({
        dedupeKey,
        visitorId: payload.visitorId,
        sessionId: payload.sessionId,
        heuristicName,
        channel: 'mock',
        outcome: 'sent',
        latencyMs: 0,
      });
      return {
        success: true,
        mode: 'mock',
        payload,
      };
    }

    // 3. External channels dispatch
    const channelsDispatched: AlertDeliveryChannel[] = [];
    const dispatchPromises: Promise<ChannelDispatchOutcome>[] = [];

    if (phoneTopic) {
      channelsDispatched.push('phone_push');
      dispatchPromises.push(dispatchPhonePush(phoneTopic, payload));
    }

    if (hasEmail) {
      channelsDispatched.push('email');
      dispatchPromises.push(dispatchEmail(payload));
    }

    if (hasWebhook && webhookUrl) {
      channelsDispatched.push('webhook');
      dispatchPromises.push(dispatchWebhook(webhookUrl, payload));
    }

    if (dispatchPromises.length > 0) {
      const results = await Promise.all(dispatchPromises);
      await Promise.all(
        results.map((r) =>
          logAlertDelivery({
            dedupeKey,
            visitorId: payload.visitorId,
            sessionId: payload.sessionId,
            heuristicName,
            channel: r.channel,
            outcome: r.ok ? 'sent' : 'failed',
            httpStatus: r.statusCode,
            latencyMs: r.latencyMs,
            errorMessage: r.errorMessage,
          })
        )
      );
      return {
        success: true,
        mode: channelsDispatched[0] || 'webhook',
        channels: channelsDispatched,
        payload,
      };
    }

    // Fallback: Console warning if no active channels configured
    console.warn('[Sentinel Alert Fallback]', formatAlertSummary(payload));
    await logAlertDelivery({
      dedupeKey,
      visitorId: payload.visitorId,
      sessionId: payload.sessionId,
      heuristicName,
      channel: 'console',
      outcome: 'sent',
      latencyMs: 0,
    });
    return {
      success: true,
      mode: 'console',
      payload,
    };
  } catch (error: any) {
    console.error('[Sentinel Alert Dispatcher Exception]', error);
    return {
      success: false,
      mode: 'none',
      error: error?.message || 'Unknown alert dispatch error',
    };
  }
}
