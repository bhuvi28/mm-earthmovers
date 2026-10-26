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
  const expanded: any = {};
  for (const [k, v] of Object.entries(compacted)) {
    const fullKey = REVERSE_KEY_MAP[k] || k;
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

/**
 * Browser & Node compatible Base64 decoder
 */
export function decodePayload(raw: string): any[] {
  try {
    // If incoming payload is raw JSON (fallback)
    if (raw.trim().startsWith('[') || raw.trim().startsWith('{')) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    }

    let decodedStr = '';
    if (typeof Buffer !== 'undefined') {
      decodedStr = Buffer.from(raw, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      decodedStr = atob(raw);
    }

    const unscrambled = scrambleString(decodeURIComponent(decodedStr));
    const compactedList = JSON.parse(unscrambled);
    const list = Array.isArray(compactedList) ? compactedList : [compactedList];
    return list.map(expandEvent);
  } catch (e) {
    console.error('Failed to decode analytics payload:', e);
    return [];
  }
}
