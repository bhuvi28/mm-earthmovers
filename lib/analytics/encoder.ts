/**
 * Analytics Payload Obfuscation & Encoding
 * Compacts and obfuscates event tracking payloads so that inspecting
 * Chrome DevTools Network tab displays an opaque string instead of readable JSON.
 */

// Key mapping for minification
const KEY_MAP: Record<string, string> = {
  visitorId: 'v',
  sessionId: 's',
  eventType: 't',
  pagePath: 'p',
  pageTitle: 'h',
  elementText: 'l',
  elementTarget: 'u',
  elementTag: 'g',
  metadata: 'm',
  clientMeta: 'c',
};

const REVERSE_KEY_MAP: Record<string, string> = Object.entries(KEY_MAP).reduce(
  (acc, [k, v]) => ({ ...acc, [v]: k }),
  {}
);

/**
 * Compacts an event object using single-character keys
 */
function compactEvent(ev: any): any {
  const compacted: any = {};
  for (const [k, v] of Object.entries(ev)) {
    if (v !== undefined && v !== null && v !== '') {
      const shortKey = KEY_MAP[k] || k;
      compacted[shortKey] = v;
    }
  }
  return compacted;
}

/**
 * Restores a compacted event object to full keys
 */
function expandEvent(compacted: any): any {
  if (!compacted || typeof compacted !== 'object' || Array.isArray(compacted)) {
    return {};
  }
  const expanded: any = {};
  for (const [k, v] of Object.entries(compacted)) {
    const fullKey = REVERSE_KEY_MAP[k] || k;
    if (
      fullKey !== k &&
      Object.prototype.hasOwnProperty.call(compacted, fullKey) &&
      compacted[fullKey] !== undefined
    ) {
      continue;
    }
    expanded[fullKey] = v;
  }
  return expanded;
}

/**
 * XOR mask transformation for obfuscation
 */
const SALT = 0x5a;

function scrambleString(str: string): string {
  const chars = [];
  for (let i = 0; i < str.length; i++) {
    chars.push(String.fromCharCode(str.charCodeAt(i) ^ (SALT + (i % 7))));
  }
  return chars.join('');
}

/**
 * Browser & Node compatible Base64 encoder
 */
export function encodePayload(events: any[]): string {
  try {
    const compacted = events.map(compactEvent);
    const jsonStr = JSON.stringify(compacted);
    const scrambled = scrambleString(jsonStr);

    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(encodeURIComponent(scrambled));
    } else {
      return Buffer.from(encodeURIComponent(scrambled)).toString('base64');
    }
  } catch (e) {
    // Fallback if encoding fails
    return JSON.stringify(events);
  }
}

const BASE64_OR_URLSAFE_RE = /^[A-Za-z0-9+/=_-]+$/;

/**
 * Strict payload decoder returning structured failure instead of silently swallowing invalid input.
 */
export function tryDecodePayload(
  raw: string
): { ok: true; events: any[] } | { ok: false; error: string } {
  try {
    if (typeof raw !== 'string') {
      return { ok: false, error: 'Payload must be a string' };
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return { ok: false, error: 'Empty payload' };
    }

    // Raw JSON array or single event object fallback
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object') {
        return { ok: false, error: 'Decoded payload is not an event list' };
      }
      const list = Array.isArray(parsed) ? parsed : [parsed];
      return { ok: true, events: list.map(expandEvent) };
    }

    if (!BASE64_OR_URLSAFE_RE.test(trimmed)) {
      return { ok: false, error: 'Invalid obfuscated payload characters' };
    }

    // Normalize URL-safe base64 if used
    const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    let decodedStr = '';
    if (typeof Buffer !== 'undefined') {
      decodedStr = Buffer.from(normalized, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      decodedStr = atob(normalized);
    }

    if (!decodedStr) {
      return { ok: false, error: 'Decoded payload is empty' };
    }

    const unscrambled = scrambleString(decodeURIComponent(decodedStr));
    const compactedList = JSON.parse(unscrambled);
    if (!compactedList || typeof compactedList !== 'object') {
      return { ok: false, error: 'Decoded payload is not an event list' };
    }
    const list = Array.isArray(compactedList) ? compactedList : [compactedList];
    return { ok: true, events: list.map(expandEvent) };
  } catch {
    return { ok: false, error: 'Malformed analytics payload' };
  }
}

/**
 * Browser & Node compatible Base64 decoder
 */
export function decodePayload(raw: string): any[] {
  const result = tryDecodePayload(raw);
  if (!result.ok) {
    console.error('Failed to decode analytics payload:', result.error);
    return [];
  }
  return result.events;
}
