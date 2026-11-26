'use client';

import { encodePayload } from './encoder';

// Client-side Analytics & Behavioral Tracker SDK
export interface TrackerConfig {
  endpoint?: string;
  debug?: boolean;
}

export type AnalyticsEventType =
  | 'pageview'
  | 'heartbeat'
  | 'click'
  | 'rage_click'
  | 'copy'
  | 'search'
  | 'identify'
  | 'section_view'
  | 'form_focus'
  | 'form_start'
  | 'form_validation_error'
  | 'form_abandon'
  | 'form_submit'
  | 'form_submit_error'
  | 'placeholder_impression'
  | 'image_zoom'
  | 'spec_toggle'
  | 'related_product_click'
  | 'export_banner_view'
  | 'client_ops'
  | 'model_faq_accordion_toggle'
  | 'model_sibling_switcher_card'
  | 'video_play'
  | 'video_progress'
  | 'video_switch'
  | 'video_complete'
  | 'loading_screen_timing'
  | 'client_error'
  | 'not_found'
  | 'review_redirect';

export interface TrackExtra {
  elementTag?: string;
  elementText?: string;
  elementTarget?: string;
  searchQuery?: string;
  searchResultsCount?: number;
  productSlug?: string;
  productCategory?: string;
  pagePath?: string;
  pageTitle?: string;
}

export interface QueuedEvent {
  visitorId: string;
  sessionId: string;
  eventType: AnalyticsEventType;
  pagePath: string;
  pageTitle?: string;
  elementText?: string;
  elementTarget?: string;
  elementTag?: string;
  metadata?: Record<string, any>;
  clientMeta?: {
    deviceType?: string;
    screenResolution?: string;
    language?: string;
    timezone?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface UploadChunk {
  batchId: string;
  payload: string;
  events: QueuedEvent[];
}

export const MAX_TELEMETRY_UPLOAD_BYTES = 49152;
export const MAX_TELEMETRY_BATCH_EVENTS = 50;
export const RETRY_QUEUE_STORAGE_KEY = 'mm_retry_queue';
export const MAX_RETRY_QUEUE_EVENTS = 50;
const RETRY_BACKOFF_MS = [2000, 8000, 30000];

const ENVELOPE_KEYS = [
  'metadata',
  'elementText',
  'elementTarget',
  'elementTag',
  'pagePath',
  'pageTitle',
  'clientMeta',
  'visitorId',
  'sessionId',
  'eventType',
];

function utf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(str, 'utf8');
  }
  return encodeURIComponent(str).replace(/%[A-F\d]{2}/gi, 'U').length;
}

function generateBatchId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'b_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
}

function buildChunkPayload(events: QueuedEvent[], batchId: string): string {
  return JSON.stringify({ d: encodePayload(events), batchId });
}

export function safeSlice(str: string, maxLen: number): string {
  if (!str || maxLen <= 0) return '';
  let out = '';
  let i = 0;
  while (i < str.length && out.length < maxLen) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          if (out.length + 2 > maxLen) {
            break;
          }
          out += str.charAt(i) + str.charAt(i + 1);
          i += 2;
          continue;
        }
      }
      // Strip pre-existing unpaired high surrogate
      i += 1;
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      // Strip pre-existing unpaired low surrogate
      i += 1;
      continue;
    }
    out += str.charAt(i);
    i += 1;
  }
  return out;
}

function sanitizeOversizedEvent(ev: QueuedEvent, minimal = false): QueuedEvent {
  let trimmedMeta: Record<string, any> | undefined;
  if (minimal) {
    trimmedMeta = { truncated: true };
  } else if (ev.metadata && typeof ev.metadata === 'object') {
    trimmedMeta = {};
    for (const [k, v] of Object.entries(ev.metadata)) {
      if (typeof v === 'string') {
        trimmedMeta[k] = safeSlice(v, 500);
      } else {
        trimmedMeta[k] = v;
      }
    }
  }

  return {
    ...ev,
    pagePath: ev.pagePath ? safeSlice(ev.pagePath, 500) || '/' : '/',
    pageTitle: ev.pageTitle ? safeSlice(ev.pageTitle, 200) : undefined,
    elementText: ev.elementText ? safeSlice(ev.elementText, minimal ? 80 : 200) : undefined,
    elementTarget: ev.elementTarget ? safeSlice(ev.elementTarget, minimal ? 200 : 500) : undefined,
    metadata: trimmedMeta,
  };
}

export function chunkEventsForUpload(
  events: QueuedEvent[],
  maxBytes: number = MAX_TELEMETRY_UPLOAD_BYTES,
  maxEvents: number = MAX_TELEMETRY_BATCH_EVENTS
): UploadChunk[] {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const chunks: UploadChunk[] = [];
  let currentEvents: QueuedEvent[] = [];
  let currentBatchId = generateBatchId();
  let currentPayload = '';

  const finalizeCurrent = () => {
    if (currentEvents.length > 0) {
      chunks.push({
        batchId: currentBatchId,
        payload: currentPayload || buildChunkPayload(currentEvents, currentBatchId),
        events: currentEvents,
      });
      currentEvents = [];
      currentBatchId = generateBatchId();
      currentPayload = '';
    }
  };

  for (const rawEvent of events) {
    const candidate = currentEvents.concat([rawEvent]);
    const candidatePayload = buildChunkPayload(candidate, currentBatchId);
    const candidateBytes = utf8ByteLength(candidatePayload);

    if (candidate.length <= maxEvents && candidateBytes <= maxBytes) {
      currentEvents = candidate;
      currentPayload = candidatePayload;
      continue;
    }

    if (currentEvents.length > 0) {
      finalizeCurrent();
    }

    // Check whether the single event fits on its own
    const singleBatchId = generateBatchId();
    let singleEvent = rawEvent;
    let singlePayload = buildChunkPayload([singleEvent], singleBatchId);

    if (utf8ByteLength(singlePayload) <= maxBytes) {
      currentEvents = [singleEvent];
      currentBatchId = singleBatchId;
      currentPayload = singlePayload;
      continue;
    }

    // Truncate oversized single event safely
    singleEvent = sanitizeOversizedEvent(rawEvent, false);
    singlePayload = buildChunkPayload([singleEvent], singleBatchId);
    if (utf8ByteLength(singlePayload) <= maxBytes) {
      chunks.push({ batchId: singleBatchId, payload: singlePayload, events: [singleEvent] });
      continue;
    }

    singleEvent = sanitizeOversizedEvent(rawEvent, true);
    singlePayload = buildChunkPayload([singleEvent], singleBatchId);
    if (utf8ByteLength(singlePayload) <= maxBytes) {
      chunks.push({ batchId: singleBatchId, payload: singlePayload, events: [singleEvent] });
    }
    // Otherwise drop single unsendable oversized event instead of looping forever
  }

  finalizeCurrent();
  return chunks;
}

export class AnalyticsTracker {
  private visitorId: string = '';
  private sessionId: string = '';
  private queue: QueuedEvent[] = [];
  private memoryRetryQueue: QueuedEvent[] = [];
  private storageWriteFailed: boolean = false;
  private flushTimer: any = null;
  private retryTimer: any = null;
  private retryAttempt: number = 0;
  private endpoint: string = '/api/analytics';
  private debug: boolean = false;
  private isInitialized: boolean = false;
  private lastClickTime: number = 0;
  private lastClickedElement: HTMLElement | null = null;
  private clickCountOnElement: number = 0;
  private sectionTimers: Map<string, number> = new Map();
  private sectionObserver: IntersectionObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        this.debug = urlParams.get('debug') === 'analytics' || localStorage.getItem('mm_debug') === 'true';
      } catch {}
      this.init();
    }
  }

  private init() {
    if (this.isInitialized) return;

    // Guard: Never initialize tracker for automated headless bots, lighthouse, or Vercel screenshot runners
    if (typeof navigator !== 'undefined') {
      if (
        navigator.webdriver ||
        /headless|bot|crawl|spider|lighthouse|vercel|screenshot/i.test(navigator.userAgent)
      ) {
        return;
      }
    }

    this.isInitialized = true;

    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();

    this.setupAutoClickTracking();
    this.setupCopyTracking();
    this.setupSectionAttentionObserver();
    this.setupHeartbeat();
    this.setupUnloadBeacon();
    this.drainRetryQueue();
  }

  // --- Retry Queue Persistence ---
  private readRetryQueue(): QueuedEvent[] {
    if (this.storageWriteFailed) {
      return this.memoryRetryQueue.slice();
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(RETRY_QUEUE_STORAGE_KEY);
        if (!raw) return this.memoryRetryQueue.slice();
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(-MAX_RETRY_QUEUE_EVENTS);
        }
      }
    } catch {}
    return this.memoryRetryQueue.slice();
  }

  private writeRetryQueue(items: QueuedEvent[]): void {
    const capped = items.slice(-MAX_RETRY_QUEUE_EVENTS);
    this.memoryRetryQueue = capped;
    try {
      if (typeof localStorage !== 'undefined') {
        if (capped.length === 0) {
          localStorage.removeItem(RETRY_QUEUE_STORAGE_KEY);
        } else {
          localStorage.setItem(RETRY_QUEUE_STORAGE_KEY, JSON.stringify(capped));
        }
        this.storageWriteFailed = false;
      }
    } catch {
      // Fallback safely to memoryRetryQueue on QuotaExceededError or private mode
      this.storageWriteFailed = true;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(RETRY_QUEUE_STORAGE_KEY);
        }
      } catch {}
    }
  }

  private enqueueRetryEvents(events: QueuedEvent[]): void {
    if (!events || events.length === 0) return;
    const existing = this.readRetryQueue();
    const combined = existing.concat(events).slice(-MAX_RETRY_QUEUE_EVENTS);
    this.writeRetryQueue(combined);
  }

  private drainRetryQueue(): void {
    const queued = this.readRetryQueue();
    if (queued.length === 0) return;
    this.writeRetryQueue([]);
    this.queue = queued.concat(this.queue);
    this.flush(false);
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    const idx = Math.min(this.retryAttempt, RETRY_BACKOFF_MS.length - 1);
    const delay = RETRY_BACKOFF_MS[idx];
    this.retryAttempt = Math.min(this.retryAttempt + 1, RETRY_BACKOFF_MS.length);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.drainRetryQueue();
    }, delay);
  }

  // --- ID & Session Management ---
  private getOrCreateVisitorId(): string {
    const KEY = 'mm_vid';
    try {
      let vid = localStorage.getItem(KEY);
      if (!vid) {
        vid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem(KEY, vid);
      }
      if (typeof document !== 'undefined' && !document.cookie.includes(`${KEY}=${vid}`)) {
        document.cookie = `${KEY}=${vid}; path=/; max-age=31536000; SameSite=Lax`;
      }
      return vid;
    } catch {
      return 'v_mem_' + Math.random().toString(36).substring(2, 15);
    }
  }

  private getOrCreateSessionId(): string {
    const KEY = 'mm_sid';
    const EXP_KEY = 'mm_sid_exp';
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 mins

    try {
      const lastExp = sessionStorage.getItem(EXP_KEY);
      let sid = sessionStorage.getItem(KEY);

      if (!sid || !lastExp || now > parseInt(lastExp, 10)) {
        sid = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 's_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        sessionStorage.setItem(KEY, sid);
      }

      sessionStorage.setItem(EXP_KEY, (now + timeout).toString());
      return sid;
    } catch {
      return 's_mem_' + Math.random().toString(36).substring(2, 15);
    }
  }

  private getClientMetadata() {
    if (typeof window === 'undefined') return {};

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const width = window.screen.width;
      const height = window.screen.height;

      let deviceType = 'desktop';
      if (width < 768) deviceType = 'mobile';
      else if (width <= 1024) deviceType = 'tablet';

      return {
        deviceType,
        screenResolution: `${width}x${height}`,
        language: navigator.language || 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        referrer: document.referrer || '',
        utmSource: urlParams.get('utm_source') || undefined,
        utmMedium: urlParams.get('utm_medium') || undefined,
        utmCampaign: urlParams.get('utm_campaign') || undefined,
      };
    } catch {
      return {};
    }
  }

  // --- Event Ingestion & Dispatch ---
  public track(eventType: AnalyticsEventType, data?: Partial<QueuedEvent>): void;
  public track(
    eventType: AnalyticsEventType,
    metadata?: Record<string, unknown>,
    extra?: TrackExtra
  ): void;
  public track(
    eventType: AnalyticsEventType,
    dataOrMetadata: Partial<QueuedEvent> | Record<string, unknown> = {},
    extra?: TrackExtra
  ): void {
    if (typeof window === 'undefined') return;

    let data: Partial<QueuedEvent>;
    if (extra !== undefined) {
      const mergedMeta: Record<string, any> =
        dataOrMetadata && typeof dataOrMetadata === 'object' ? { ...dataOrMetadata } : {};
      if (extra.searchQuery !== undefined) mergedMeta.searchQuery = extra.searchQuery;
      if (extra.searchResultsCount !== undefined) mergedMeta.searchResultsCount = extra.searchResultsCount;
      if (extra.productSlug !== undefined) mergedMeta.productSlug = extra.productSlug;
      if (extra.productCategory !== undefined) mergedMeta.productCategory = extra.productCategory;

      data = {
        pagePath: extra.pagePath,
        pageTitle: extra.pageTitle,
        elementTag: extra.elementTag,
        elementText: extra.elementText,
        elementTarget: extra.elementTarget,
        metadata: Object.keys(mergedMeta).length > 0 ? mergedMeta : undefined,
      };
    } else if (dataOrMetadata && typeof dataOrMetadata === 'object') {
      const keys = Object.keys(dataOrMetadata);
      const isEnvelope =
        keys.length === 0 || keys.every((k) => ENVELOPE_KEYS.includes(k));
      if (isEnvelope) {
        data = dataOrMetadata as Partial<QueuedEvent>;
      } else {
        const metaObj = dataOrMetadata as Record<string, any>;
        data = {
          ...(typeof metaObj.pagePath === 'string' && metaObj.pagePath.trim()
            ? { pagePath: metaObj.pagePath }
            : {}),
          metadata: metaObj,
        };
      }
    } else {
      data = {};
    }

    const pagePath = data.pagePath || window.location.pathname;

    // Strict guard: Never track admin pages or internal dashboard actions
    if (pagePath.startsWith('/admin')) {
      return;
    }

    // Strict guard: Never track automated headless bots or crawlers
    if (typeof navigator !== 'undefined' && (navigator.webdriver || /headless|bot|crawl|spider|lighthouse|vercel|screenshot/i.test(navigator.userAgent))) {
      return;
    }

    // Refresh session expiry
    this.getOrCreateSessionId();

    const event: QueuedEvent = {
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      eventType,
      pagePath: data.pagePath || window.location.pathname,
      pageTitle: data.pageTitle || document.title,
      elementText: data.elementText,
      elementTarget: data.elementTarget,
      elementTag: data.elementTag,
      metadata: data.metadata,
      clientMeta: this.getClientMetadata(),
    };

    this.queue.push(event);

    if (this.debug) {
      console.log('[MM Analytics]', eventType, event);
    }

    // High priority events dispatch immediately
    if (
      eventType === 'form_submit' ||
      eventType === 'identify' ||
      (eventType === 'click' && (data.elementTarget?.includes('wa.me') || data.elementTarget?.startsWith('tel:')))
    ) {
      this.flush(false);
    } else if (eventType === 'pageview') {
      // Dispatch pageviews within 150ms so network call appears immediately in DevTools
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flush(false), 150);
    } else {
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(false), 1000);
      }
    }
  }

  public flush(isUnload: boolean = false) {
    if (this.queue.length === 0) return;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const itemsToSend = this.queue.slice();
    this.queue = [];

    const chunks = chunkEventsForUpload(itemsToSend);
    if (chunks.length === 0) return;

    if (this.debug) {
      console.log(`[MM Analytics] Dispatching ${itemsToSend.length} event(s) in ${chunks.length} chunk(s) to ${this.endpoint}`);
    }

    if (isUnload) {
      for (const chunk of chunks) {
        let sent = false;
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          try {
            const blob = new Blob([chunk.payload], { type: 'text/plain' });
            sent = navigator.sendBeacon(this.endpoint, blob);
          } catch {
            sent = false;
          }
        }
        if (!sent) {
          this.enqueueRetryEvents(chunk.events);
        }
      }
      return;
    }

    // Active session flush: fetch with keepalive: true and retry queue on 5xx/429/network error
    for (const chunk of chunks) {
      try {
        fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: chunk.payload,
          keepalive: true,
        })
          .then((res) => {
            if (this.debug) {
              console.log(`[MM Analytics] Ingestion response status: ${res.status}`);
            }
            if (res.ok) {
              this.retryAttempt = 0;
            } else if (res.status >= 500 || res.status === 429) {
              this.enqueueRetryEvents(chunk.events);
              this.scheduleRetry();
            }
            // Do NOT retry 400 / 403 / 413 permanent rejections
          })
          .catch(() => {
            this.enqueueRetryEvents(chunk.events);
            this.scheduleRetry();
          });
      } catch {
        this.enqueueRetryEvents(chunk.events);
        this.scheduleRetry();
      }
    }
  }

  // --- Auto Trackers ---
  private setupAutoClickTracking() {
    document.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const now = Date.now();

        // 1. Detect Rage Clicks: 3+ rapid clicks within 800ms on the exact same element
        if (this.lastClickedElement === target && now - this.lastClickTime < 800) {
          this.clickCountOnElement++;
          if (this.clickCountOnElement >= 3) {
            this.track('rage_click', {
              elementText: safeSlice((target.innerText || target.getAttribute('aria-label') || '').trim(), 80),
              elementTag: target.tagName.toLowerCase(),
              metadata: {
                clickBurst: this.clickCountOnElement,
                className: target.className !== undefined && target.className !== null ? safeSlice(target.className.toString(), 100) : undefined,
              },
            });
            this.clickCountOnElement = 0; // Reset after firing
          }
        } else {
          this.lastClickedElement = target;
          this.clickCountOnElement = 1;
        }
        this.lastClickTime = now;

        // 2. Interactive Element Detection
        const clickable = target.closest<HTMLElement>(
          'a, button, [role="button"], [data-track], input[type="submit"]'
        );

        if (clickable) {
          const text = safeSlice((clickable.innerText || clickable.getAttribute('aria-label') || clickable.getAttribute('title') || '').trim(), 100);
          const href = clickable.getAttribute('href') || (clickable as HTMLButtonElement).formAction || '';
          const tag = clickable.tagName.toLowerCase();
          const trackLabel = clickable.getAttribute('data-track') || undefined;

          // Suppress duplicate 'click' on <details> accordions handled by onToggle
          if (trackLabel === 'model_faq_accordion_toggle' || trackLabel === 'spec_toggle') {
            return;
          }

          if (trackLabel === 'related_product_click') {
            const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
            const hrefParts = href.split('?')[0].split('/').filter(Boolean);
            const sourceProductSlug =
              clickable.getAttribute('data-source-slug') ||
              clickable.getAttribute('data-source-product-slug') ||
              (pathParts[0] === 'products' && pathParts.length >= 3 ? pathParts[2] : undefined);
            const targetProductSlug =
              clickable.getAttribute('data-product-slug') ||
              clickable.getAttribute('data-target-product-slug') ||
              (hrefParts[0] === 'products' && hrefParts.length >= 3 ? hrefParts[2] : undefined);
            const targetTitle =
              clickable.getAttribute('data-target-title') ||
              clickable.getAttribute('data-product-title') ||
              text ||
              undefined;
            const targetPartNumber =
              clickable.getAttribute('data-target-part-number') ||
              clickable.getAttribute('data-part-number') ||
              undefined;
            const rawPos = clickable.getAttribute('data-position');
            const position = rawPos !== null && rawPos !== '' && Number.isFinite(Number(rawPos)) ? Number(rawPos) : undefined;
            const heading = clickable.getAttribute('data-heading') || undefined;

            this.track('related_product_click', {
              elementText: text || targetTitle || 'Related Product',
              elementTarget: href,
              elementTag: tag,
              metadata: {
                trackLabel,
                sourceProductSlug,
                targetProductSlug,
                targetTitle,
                targetPartNumber,
                ...(position !== undefined ? { position } : {}),
                ...(heading ? { heading } : {}),
              },
            });
            return;
          }

          if (trackLabel === 'model_sibling_switcher_card') {
            const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
            const hrefParts = href.split('?')[0].split('/').filter(Boolean);
            const sourceMachineSlug =
              clickable.getAttribute('data-source-machine-slug') ||
              (pathParts[0] === 'models' && pathParts.length >= 2 ? pathParts[1] : undefined);
            const targetMachineSlug =
              clickable.getAttribute('data-target-machine-slug') ||
              clickable.getAttribute('data-machine-slug') ||
              (hrefParts[0] === 'models' && hrefParts.length >= 2 ? hrefParts[1] : undefined);
            const targetMachineName =
              clickable.getAttribute('data-target-machine-name') ||
              clickable.getAttribute('data-machine-name') ||
              text ||
              undefined;
            const rawPos = clickable.getAttribute('data-position');
            const position = rawPos !== null && rawPos !== '' && Number.isFinite(Number(rawPos)) ? Number(rawPos) : undefined;

            this.track('model_sibling_switcher_card', {
              elementText: text || targetMachineName || 'Sibling Model',
              elementTarget: href,
              elementTag: tag,
              metadata: {
                trackLabel,
                sourceMachineSlug,
                targetMachineSlug,
                targetMachineName,
                ...(position !== undefined ? { position } : {}),
              },
            });
            return;
          }

          // Context extraction: check if inside a product card, on element, or on a product detail page
          const productContainer = clickable.closest('[data-product-title]') || clickable;
          const placement =
            clickable.getAttribute('data-placement') ||
            productContainer.getAttribute('data-placement') ||
            undefined;
          const searchQuery =
            clickable.getAttribute('data-search-query') ||
            productContainer.getAttribute('data-search-query') ||
            undefined;
          const machineSlug =
            clickable.getAttribute('data-machine-slug') ||
            productContainer.getAttribute('data-machine-slug') ||
            undefined;
          const machineName =
            clickable.getAttribute('data-machine-name') ||
            productContainer.getAttribute('data-machine-name') ||
            undefined;
          let productTitle = clickable.getAttribute('data-product-title') || productContainer.getAttribute('data-product-title') || undefined;
          let partNumber = clickable.getAttribute('data-part-number') || productContainer.getAttribute('data-part-number') || undefined;
          let category = clickable.getAttribute('data-category') || productContainer.getAttribute('data-category') || undefined;
          let productSlug = clickable.getAttribute('data-product-slug') || productContainer.getAttribute('data-product-slug') || undefined;

          // If on a product detail page (/products/:category/:slug), auto-infer from URL if not specified
          if (!productSlug && typeof window !== 'undefined' && window.location.pathname.startsWith('/products/')) {
            const parts = window.location.pathname.split('/').filter(Boolean);
            if (parts.length >= 3) {
              category = category || parts[1];
              productSlug = productSlug || parts[2];
            }
          }

          const productContext = (productTitle || partNumber || productSlug || category)
            ? { productTitle, partNumber, category, productSlug }
            : undefined;

          this.track('click', {
            elementText: text || trackLabel || 'Icon Button',
            elementTarget: href,
            elementTag: tag,
            metadata: {
              trackLabel,
              placement,
              searchQuery,
              machineSlug,
              machineName,
              ...productContext,
            },
          });
        }
      },
      { passive: true }
    );
  }

  private setupCopyTracking() {
    document.addEventListener('copy', () => {
      const selection = window.getSelection()?.toString().trim();
      if (!selection || selection.length < 2 || selection.length > 120) return;

      // Determine item type
      let itemType = 'general_text';
      if (/^[0-9A-Za-z]+([-\s/._][0-9A-Za-z]+)*$/.test(selection) && selection.length >= 3 && selection.length <= 60) {
        itemType = 'part_number';
      } else if (/\+?[\d\s-]{10,}/.test(selection)) {
        itemType = 'phone_number';
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selection)) {
        itemType = 'email';
      }

      this.track('copy', {
        metadata: {
          copiedText: selection,
          itemType,
        },
      });
    });
  }

  public flushSectionDwell() {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    this.sectionTimers.forEach((startTime, sectionId) => {
      const dwellSeconds = Math.round((now - startTime) / 1000);
      if (dwellSeconds >= 2) {
        this.track('section_view', {
          metadata: {
            sectionId,
            dwellSeconds,
          },
        });
      }
    });
    this.sectionTimers.clear();
  }

  public observeSections() {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return;

    if (!this.sectionObserver) {
      this.sectionObserver = new IntersectionObserver(
        (entries) => {
          const now = Date.now();
          entries.forEach((entry) => {
            const sectionId =
              entry.target.getAttribute('data-section-name') ||
              entry.target.id ||
              entry.target.tagName.toLowerCase();

            if (!sectionId || sectionId === 'body' || sectionId === 'html') return;

            if (entry.isIntersecting) {
              this.sectionTimers.set(sectionId, now);
            } else {
              const startTime = this.sectionTimers.get(sectionId);
              if (startTime) {
                const dwellSeconds = Math.round((now - startTime) / 1000);
                this.sectionTimers.delete(sectionId);

                if (dwellSeconds >= 2) {
                  this.track('section_view', {
                    metadata: {
                      sectionId,
                      dwellSeconds,
                    },
                  });
                }
              }
            }
          });
        },
        { threshold: 0.15 } // 15% visibility triggers entry
      );
    }

    const sections = document.querySelectorAll(
      'section, [data-section-name], main > div[id], [id="home"], [id="about"], [id="contact"], [id="products-overview"], [id="why-choose-us"]'
    );
    sections.forEach((s) => {
      this.sectionObserver?.observe(s);
    });
  }

  private setupSectionAttentionObserver() {
    // Initial observer setup
    setTimeout(() => {
      this.observeSections();
    }, 800);
  }

  private setupHeartbeat() {
    // 30 second active heartbeat
    setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
          return;
        }
        this.track('heartbeat');
      }
    }, 30000);
  }

  private setupUnloadBeacon() {
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushSectionDwell();
        this.flush(true);
      }
    });

    window.addEventListener('pagehide', () => {
      this.flushSectionDwell();
      this.flush(true);
    });
  }

  // --- Public Custom Tracking APIs ---
  public pageview(path?: string, title?: string) {
    this.track('pageview', {
      pagePath: path || window.location.pathname,
      pageTitle: title || document.title,
    });
  }

  public getSessionIds(): { visitorId: string; sessionId: string } {
    return {
      visitorId: this.visitorId || '',
      sessionId: this.sessionId || '',
    };
  }

  public identify(lead: { name?: string; contact?: string; email?: string; phone?: string }) {
    this.track('identify', {
      metadata: lead,
    });
  }

  public trackSearch(
    query: string,
    resultsCount: number,
    category?: string,
    extra?: { searchSurface?: string; machineSlug?: string; machineName?: string }
  ) {
    if (!query || query.trim().length === 0) return;
    this.track('search', {
      metadata: {
        query: query.trim(),
        resultsCount,
        zeroResults: resultsCount === 0,
        category,
        ...(extra?.searchSurface ? { searchSurface: extra.searchSurface } : {}),
        ...(extra?.machineSlug ? { machineSlug: extra.machineSlug } : {}),
        ...(extra?.machineName ? { machineName: extra.machineName } : {}),
      },
    });
  }

  public trackForm(
    action: 'start' | 'validation_error' | 'abandon' | 'submit' | 'submit_error',
    formName: string,
    metadata?: Record<string, any>
  ) {
    this.track(`form_${action}` as AnalyticsEventType, {
      elementText: formName,
      metadata,
    });
  }
}

// Global Singleton Instance
let trackerInstance: AnalyticsTracker | null = null;

export function getTracker(): AnalyticsTracker {
  if (!trackerInstance && typeof window !== 'undefined') {
    trackerInstance = new AnalyticsTracker();
  }
  return trackerInstance || ({} as AnalyticsTracker);
}
