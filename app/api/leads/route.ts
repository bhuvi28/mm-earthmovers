import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/analytics/db';
import { extractGeolocation } from '@/lib/analytics/geo';
import { extractClientIp } from '@/lib/restrictions-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_STATICFORMS_KEY = 'sf_fd80e723henagadlica8agki';
const DEFAULT_STATICFORMS_ENDPOINT = 'https://api.staticforms.xyz/submit';

interface FallbackResult {
  delivered: boolean;
  provider: string | null;
  reference: string | null;
}

async function sendFallbackLeadNotification(payload: {
  leadId: number | null;
  source: string;
  placement: string | null;
  name: string | null;
  company: string | null;
  contact: string;
  message: string | null;
  country: string;
  city: string;
}): Promise<FallbackResult> {
  const emailTo = process.env.ALERT_EMAIL_TO || 'hm.mmearthmovers@gmail.com';
  const summaryText = [
    `Source: ${payload.source}${payload.placement ? ` (${payload.placement})` : ''}`,
    `Lead ID: ${payload.leadId ?? 'unsaved'}`,
    `Name: ${payload.name || 'Not provided'}`,
    `Company: ${payload.company || 'Not provided'}`,
    `Contact: ${payload.contact}`,
    `Location: ${payload.city}, ${payload.country}`,
    `Message: ${payload.message || 'N/A'}`,
  ].join('\n');

  // Always log structured backup trace in server logs
  console.warn('[Leads Fallback Alert]\n' + summaryText);

  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.ALERT_EMAIL_FROM || 'alerts@mmearthmovers.com',
          to: [emailTo],
          subject: `[Backup Lead Alert] Website Enquiry from ${payload.name || payload.contact}`,
          text: summaryText,
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          delivered: true,
          provider: 'resend_fallback',
          reference: data?.id ? String(data.id) : 'ok',
        };
      }
    } catch (err) {
      console.error('[Resend Fallback Error]', err);
    }
  }

  const ntfyTopic =
    process.env.NTFY_TOPIC || process.env.PHONE_ALERT_CODE || process.env.ALERT_PHONE_TOPIC;
  if (ntfyTopic) {
    try {
      const res = await fetch(`https://ntfy.sh/${encodeURIComponent(ntfyTopic.trim())}`, {
        method: 'POST',
        headers: {
          Title: `Backup Website Enquiry (${payload.source})`,
          Priority: 'high',
        },
        body: summaryText,
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        return {
          delivered: true,
          provider: 'ntfy_fallback',
          reference: ntfyTopic.trim(),
        };
      }
    } catch (err) {
      console.error('[ntfy Fallback Error]', err);
    }
  }

  return { delivered: false, provider: null, reference: null };
}

/**
 * Resilient Form Submission Proxy (`PROD-01`):
 * 1. Validates payload and rejects bots cleanly
 * 2. Upserts `analytics_visitors` (FK-safe) and inserts immutable backup into `analytics_leads`
 * 3. Forwards server-side to StaticForms with 3.5s timeout + fallback alerting
 * 4. Returns 201 whenever PostgreSQL backup succeeded so no customer enquiry is lost
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid enquiry payload' }, { status: 400 });
  }

  // Silent honeypot filter for scripted form bots
  if (typeof body.honeypot === 'string' && body.honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true, id: null }, { status: 200 });
  }

  const contactValue = String(
    body.contact || body['contact-info'] || body.phone || body.email || ''
  )
    .trim()
    .slice(0, 128);

  if (contactValue.length < 5) {
    return NextResponse.json(
      { error: 'Please provide a valid phone number or email address.' },
      { status: 400 }
    );
  }

  const source =
    body.source === 'targeted_modal' ? 'targeted_modal' : 'contact_form';
  const placement = body.placement ? String(body.placement).trim().slice(0, 64) : source;
  const name = body.name ? String(body.name).trim().slice(0, 128) : null;
  const company = body.company ? String(body.company).trim().slice(0, 128) : null;
  const message = body.message ? String(body.message).trim() : null;
  const subject = body.subject
    ? String(body.subject).trim().slice(0, 160)
    : 'New Enquiry from MM Earthmovers Website';
  const visitorId =
    typeof body.visitorId === 'string' && body.visitorId.trim().length > 0
      ? body.visitorId.trim().slice(0, 64)
      : null;
  const sessionId =
    typeof body.sessionId === 'string' && body.sessionId.trim().length > 0
      ? body.sessionId.trim().slice(0, 64)
      : null;
  const productSlug = body.productSlug ? String(body.productSlug).trim().slice(0, 128) : null;
  const partNumber = body.partNumber ? String(body.partNumber).trim().slice(0, 128) : null;
  const machineSlug = body.machineSlug ? String(body.machineSlug).trim().slice(0, 64) : null;
  const searchQuery = body.searchQuery ? String(body.searchQuery).trim().slice(0, 256) : null;

  const clientIp = extractClientIp(req.headers);
  const geo = await extractGeolocation(req.headers);

  // Step 1: Persist durable PostgreSQL backup BEFORE calling third-party APIs
  let leadId: number | null = null;
  try {
    if (visitorId) {
      await query(
        `
        INSERT INTO analytics_visitors (
          visitor_id, ip_address, country, city, total_sessions, first_seen_at, last_seen_at
        )
        VALUES ($1, $2, $3, $4, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (visitor_id) DO UPDATE SET
          ip_address = COALESCE(NULLIF($2, ''), analytics_visitors.ip_address),
          country = COALESCE(NULLIF($3, 'Unknown'), analytics_visitors.country),
          city = COALESCE(NULLIF($4, 'Unknown'), analytics_visitors.city),
          last_seen_at = CURRENT_TIMESTAMP
        `,
        [visitorId, clientIp || null, geo.country || 'Unknown', geo.city || 'Unknown']
      );
    }

    const inserted = await query<{ id: string | number }>(
      `
      INSERT INTO analytics_leads (
        visitor_id,
        session_id,
        source,
        placement,
        name,
        company,
        contact,
        message,
        product_slug,
        part_number,
        machine_slug,
        search_query,
        delivery_status,
        ip_address,
        country,
        city
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, $15)
      RETURNING id
      `,
      [
        visitorId,
        sessionId,
        source,
        placement,
        name,
        company,
        contactValue,
        message,
        productSlug,
        partNumber,
        machineSlug,
        searchQuery,
        clientIp || null,
        geo.country || 'Unknown',
        geo.city || 'Unknown',
      ]
    );
    leadId = inserted[0]?.id !== undefined ? Number(inserted[0].id) : null;
  } catch (dbErr) {
    console.error('[Leads DB Backup Error]', dbErr);
  }

  // Step 2: Forward server-side to StaticForms (keeping secret out of browser payloads)
  let deliveryStatus: 'sent' | 'fallback_sent' | 'failed' = 'failed';
  let externalProvider: string | null = 'staticforms';
  let externalRef: string | null = null;

  const staticFormsEndpoint =
    process.env.STATICFORMS_ENDPOINT || DEFAULT_STATICFORMS_ENDPOINT;
  const staticFormsKey =
    process.env.STATICFORMS_ACCESS_KEY || DEFAULT_STATICFORMS_KEY;

  try {
    const sfRes = await fetch(staticFormsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessKey: staticFormsKey,
        name: name || 'Website Visitor',
        company: company || '',
        'contact-info': contactValue,
        message: message || 'Website enquiry',
        subject,
        replyTo: '@',
      }),
      signal: AbortSignal.timeout(3500),
    });

    const sfData = await sfRes.json().catch(() => ({}));
    if (sfRes.ok && (sfData?.id || sfData?.success)) {
      deliveryStatus = 'sent';
      externalRef = sfData?.id ? String(sfData.id) : 'ok';
    } else {
      console.error('[StaticForms Proxy Failed]', sfRes.status, sfData);
    }
  } catch (sfErr) {
    console.error('[StaticForms Proxy Exception]', sfErr);
  }

  // Step 3: Trigger backup notification channel when StaticForms fails or times out
  if (deliveryStatus !== 'sent') {
    const fallback = await sendFallbackLeadNotification({
      leadId,
      source,
      placement,
      name,
      company,
      contact: contactValue,
      message,
      country: geo.country || 'Unknown',
      city: geo.city || 'Unknown',
    });
    if (fallback.delivered) {
      deliveryStatus = 'fallback_sent';
      externalProvider = fallback.provider;
      externalRef = fallback.reference;
    } else {
      deliveryStatus = 'failed';
      externalProvider = 'staticforms';
    }
  }

  // Step 4: Record final delivery status on the PostgreSQL backup row
  if (leadId !== null) {
    try {
      await query(
        `
        UPDATE analytics_leads
        SET
          delivery_status = $1,
          external_provider = $2,
          external_ref = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        `,
        [deliveryStatus, externalProvider, externalRef, leadId]
      );
    } catch (updateErr) {
      console.error('[Leads Delivery Status Update Error]', updateErr);
    }
  }

  if (leadId === null && deliveryStatus === 'failed') {
    return NextResponse.json(
      { error: 'Could not process your enquiry right now. Please WhatsApp or call us.' },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      id: leadId,
      deliveryStatus,
    },
    { status: leadId !== null ? 201 : 200 }
  );
}
