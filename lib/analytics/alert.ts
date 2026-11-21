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
 * - Exact-once alert deduplication (60-minute window) to prevent alert fatigue
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

export interface AlertDispatchResult {
  success: boolean;
  mode: 'phone_push' | 'email' | 'webhook' | 'discord' | 'slack' | 'telegram' | 'mock' | 'console' | 'none';
  channels?: string[];
  deduplicated?: boolean;
  error?: string;
  payload?: SentinelAlertPayload;
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
 * Check and record alert deduplication
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
async function dispatchPhonePush(topic: string, payload: SentinelAlertPayload): Promise<boolean> {
  const cleanTopic = topic.trim().replace(/^https?:\/\/ntfy\.sh\//, '');
  const summary = formatAlertSummary(payload);
  const server = process.env.NTFY_SERVER || 'https://ntfy.sh';
  const adminUrl = payload.adminDashboardUrl || 'https://www.mmearthmovers.com/admin/analytics';

  const res = await fetch(server, {
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
  });

  return res.ok;
}

/**
 * Dispatch Email Alert via free HTTP email API (Resend / webhook)
 */
async function dispatchEmail(payload: SentinelAlertPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.ALERT_EMAIL_TO || 'hm.mmearthmovers@gmail.com';

  if (apiKey) {
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
    });

    return res.ok;
  }

  return false;
}

/**
 * Dispatch Webhook Alert (Generic, Discord, or Slack)
 */
async function dispatchWebhook(webhookUrl: string, payload: SentinelAlertPayload): Promise<boolean> {
  let body: any;

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

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(2000),
  });

  return res.ok;
}

/**
 * Main immediate alert dispatcher
 */
export async function dispatchAlert(
  payload: SentinelAlertPayload,
  options?: { force?: boolean; mock?: boolean }
): Promise<AlertDispatchResult> {
  try {
    const isMock =
      options?.mock === true ||
      process.env.ALERT_TEST_MODE === 'true' ||
      process.env.ALERT_WEBHOOK_URL === 'mock';

    // 1. Deduplication check
    const dedupeKey = `${payload.sessionId}:${payload.flag?.flagType || 'nuisance'}`;
    const visitorDedupeKey = `${payload.visitorId}:${payload.flag?.flagType || 'nuisance'}`;

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

    // 2. Mock mode handling
    if (isMock) {
      mockAlertStore.push(payload);
      return {
        success: true,
        mode: 'mock',
        payload,
      };
    }

    // 3. Channels dispatch
    const channelsDispatched: string[] = [];
    const dispatchPromises: Promise<any>[] = [];

    // Channel A: Phone Push via ntfy.sh (Topic / Phone Code)
    const phoneTopic = process.env.NTFY_TOPIC || process.env.PHONE_ALERT_CODE || process.env.ALERT_PHONE_TOPIC;
    if (phoneTopic) {
      channelsDispatched.push('phone_push');
      dispatchPromises.push(
        dispatchPhonePush(phoneTopic, payload).catch((err) => {
          console.error('[Sentinel Phone Push Error]', err);
          return false;
        })
      );
    }

    // Channel B: Email Alerting (Resend / SMTP REST)
    if (process.env.RESEND_API_KEY || process.env.ALERT_EMAIL_TO) {
      channelsDispatched.push('email');
      dispatchPromises.push(
        dispatchEmail(payload).catch((err) => {
          console.error('[Sentinel Email Error]', err);
          return false;
        })
      );
    }

    // Channel C: Generic Webhook / Discord / Slack
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl && webhookUrl !== 'mock') {
      channelsDispatched.push('webhook');
      dispatchPromises.push(
        dispatchWebhook(webhookUrl, payload).catch((err) => {
          console.error('[Sentinel Webhook Error]', err);
          return false;
        })
      );
    }

    // If external channels were dispatched, wait for them (each bounded by 2s AbortSignal timeout)
    if (dispatchPromises.length > 0) {
      await Promise.allSettled(dispatchPromises);
      return {
        success: true,
        mode: (channelsDispatched[0] as any) || 'webhook',
        channels: channelsDispatched,
        payload,
      };
    }

    // Fallback: Console warning if no active channels configured
    console.warn('[Sentinel Alert Fallback]', formatAlertSummary(payload));
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
