import type { ProductEnquiryStat } from '../_types/analytics';

export function decodeCityName(city?: string | null): string {
  if (!city) return '';
  try {
    return decodeURIComponent(city).replace(/%20/g, ' ');
  } catch {
    return String(city).replace(/%20/g, ' ');
  }
}

export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 0) return 'Just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatIST(dateStr?: string | null, options?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...options,
    });
  } catch {
    return String(dateStr);
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs > 0 ? `${secs}s` : ''}`.trim();
  const hrs = Math.floor(mins / 60);
  const remM = mins % 60;
  return `${hrs}h ${remM > 0 ? `${remM}m` : ''}`.trim();
}

export function getISTDateKey(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  } catch {
    return '';
  }
}

export function formatISTDayHeader(dateKey: string): string {
  if (!dateKey) return '';
  try {
    const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const parts = dateKey.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const formatted = d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (dateKey === todayKey) return `Today • ${formatted}`;
    if (dateKey === yesterdayKey) return `Yesterday • ${formatted}`;
    return formatted;
  } catch {
    return dateKey;
  }
}

export function getCountryFlag(countryCode?: string | null): string {
  if (!countryCode || countryCode === 'UN' || countryCode === 'Unknown') return '🌐';
  const code = countryCode.toUpperCase();
  if (code === 'IN') return '🇮🇳';
  if (code === 'US') return '🇺🇸';
  if (code === 'GB' || code === 'UK') return '🇬🇧';
  if (code === 'AE') return '🇦🇪';
  if (code === 'SG') return '🇸🇬';
  if (code === 'CA') return '🇨🇦';
  if (code === 'AU') return '🇦🇺';
  if (code === 'DE') return '🇩🇪';
  if (code === 'MY') return '🇲🇾';
  if (code === 'SA') return '🇸🇦';
  try {
    const codePoints = code.split('').map((c) => 127397 + c.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌐';
  }
}

export function getChannelCategory(referrer: string) {
  if (!referrer || referrer === 'Direct / None' || referrer === '-') {
    return { name: 'Direct / Bookmarks', icon: '🔗', color: '#64748b', bg: 'bg-slate-100 text-slate-700' };
  }
  const r = referrer.toLowerCase();
  if (r.includes('google') || r.includes('bing') || r.includes('yahoo') || r.includes('duckduckgo')) {
    return { name: 'Organic Search', icon: '🔍', color: '#2563eb', bg: 'bg-blue-50 text-blue-700' };
  }
  if (r.includes('whatsapp') || r.includes('wa.me')) {
    return { name: 'WhatsApp / Chat', icon: '💬', color: '#059669', bg: 'bg-emerald-50 text-emerald-700' };
  }
  if (
    r.includes('facebook') ||
    r.includes('instagram') ||
    r.includes('linkedin') ||
    r.includes('twitter') ||
    r.includes('youtube') ||
    r.includes('t.co')
  ) {
    return { name: 'Social Media', icon: '📱', color: '#7c3aed', bg: 'bg-purple-50 text-purple-700' };
  }
  return { name: 'Referral / External', icon: '🌐', color: '#d97706', bg: 'bg-amber-50 text-amber-800' };
}

export function getProductUrl(p: { slug?: string | null; category?: string | null }): string {
  const rawCategory = (p.category || '').toLowerCase();
  const cat = rawCategory.includes('grader') ? 'grader' : rawCategory;
  return `/products/${encodeURIComponent(cat)}/${encodeURIComponent(p.slug || '')}`;
}

/**
 * Generates official WhatsApp test URL for a product (`BUG-11`).
 */
export function getWhatsAppTestUrl(p: Pick<ProductEnquiryStat, 'title' | 'part_number'>): string {
  const text = `Hi MM Earthmovers, I would like to enquire about ${p.title || 'this part'}${p.part_number && p.part_number !== '-' ? ` (Part Number: ${p.part_number})` : ''}. Please share pricing and availability.`;
  return `https://wa.me/918334887009?text=${encodeURIComponent(text)}`;
}

/**
 * Generates personalized WhatsApp outreach link for an identified visitor/lead.
 */
export function buildWhatsAppOutreachUrl(
  phone?: string | null,
  name?: string | null
): string | null {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return null;
  const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const message = `Hello ${name || 'Sir'}, thank you for visiting MM Earthmovers. How may we assist you with spare parts availability and quotes today?`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

export function triggerCsvDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
