'use client';

import { encodePayload } from './encoder';

// Client-side Analytics & Behavioral Tracker SDK
export interface TrackerConfig {
  endpoint?: string;
  debug?: boolean;
}

interface QueuedEvent {
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
    screenResolution?: string;
    language?: string;
    timezone?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

class AnalyticsTracker {
  private visitorId: string = '';
  private sessionId: string = '';
  private queue: QueuedEvent[] = [];
  private flushTimer: any = null;
  private endpoint: string = '/api/analytics';
  private debug: boolean = false;
  private isInitialized: boolean = false;
  private lastClickTime: number = 0;
  private lastClickedElement: HTMLElement | null = null;
  private clickCountOnElement: number = 0;
  private sectionTimers: Map<string, number> = new Map();

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
    this.isInitialized = true;

    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();

    this.setupAutoClickTracking();
    this.setupCopyTracking();
    this.setupSectionAttentionObserver();
    this.setupHeartbeat();
    this.setupUnloadBeacon();
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
  public track(eventType: string, data: Partial<QueuedEvent> = {}) {
    if (typeof window === 'undefined') return;

    const pagePath = data.pagePath || window.location.pathname;

    // Strict guard: Never track admin pages or internal dashboard actions
    if (pagePath.startsWith('/admin')) {
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
      this.flush();
    } else if (eventType === 'pageview') {
      // Dispatch pageviews within 150ms so network call appears immediately in DevTools
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flush(), 150);
    } else {
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => this.flush(), 1000);
      }
    }
  }

  public flush() {
    if (this.queue.length === 0) return;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const itemsToSend = [...this.queue];
    this.queue = [];

    // Obfuscate payload so DevTools Network Tab never displays plain JSON
    const obfuscated = encodePayload(itemsToSend);
    const payload = JSON.stringify({ d: obfuscated });

    if (this.debug) {
      console.log(`[MM Analytics] Dispatching ${itemsToSend.length} event(s) to ${this.endpoint}`);
    }

    // Always prefer fetch with keepalive: true so Chrome DevTools displays it under Fetch/XHR
    try {
      fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
        keepalive: true,
      })
        .then((res) => {
          if (this.debug) {
            console.log(`[MM Analytics] Ingestion response status: ${res.status}`);
          }
        })
        .catch(() => {
          // Fallback to sendBeacon if fetch fails
          if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'text/plain' });
            navigator.sendBeacon(this.endpoint, blob);
          }
        });
    } catch {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          const blob = new Blob([payload], { type: 'text/plain' });
          navigator.sendBeacon(this.endpoint, blob);
        } catch {}
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
              elementText: (target.innerText || target.getAttribute('aria-label') || '').trim().slice(0, 80),
              elementTag: target.tagName.toLowerCase(),
              metadata: {
                clickBurst: this.clickCountOnElement,
                className: target.className?.toString().slice(0, 100),
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
          const text = (clickable.innerText || clickable.getAttribute('aria-label') || clickable.getAttribute('title') || '').trim().slice(0, 100);
          const href = clickable.getAttribute('href') || (clickable as HTMLButtonElement).formAction || '';
          const tag = clickable.tagName.toLowerCase();
          const trackLabel = clickable.getAttribute('data-track') || undefined;

          // Context extraction: check if inside a product card, on element, or on a product detail page
          const productContainer = clickable.closest('[data-product-title]') || clickable;
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
      if (/^[0-9a-zA-Z]{3,8}(-[0-9a-zA-Z]{2,8})*$/.test(selection)) {
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

  private setupSectionAttentionObserver() {
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        entries.forEach((entry) => {
          const sectionId = entry.target.id || entry.target.getAttribute('data-section-name') || entry.target.tagName.toLowerCase();

          if (entry.isIntersecting) {
            // User scrolled section into view
            this.sectionTimers.set(sectionId, now);
          } else {
            // User scrolled away
            const startTime = this.sectionTimers.get(sectionId);
            if (startTime) {
              const dwellSeconds = Math.round((now - startTime) / 1000);
              this.sectionTimers.delete(sectionId);

              // Only log meaningful viewing (>= 2 seconds)
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
      { threshold: 0.4 } // 40% of section visible
    );

    // Observe major sections on page load
    setTimeout(() => {
      const sections = document.querySelectorAll('section, main > div[id], [data-section-name]');
      sections.forEach((s) => observer.observe(s));
    }, 1000);
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
        this.flush();
      }
    });

    window.addEventListener('pagehide', () => {
      this.flush();
    });
  }

  // --- Public Custom Tracking APIs ---
  public pageview(path?: string, title?: string) {
    this.track('pageview', {
      pagePath: path || window.location.pathname,
      pageTitle: title || document.title,
    });
  }

  public identify(lead: { name?: string; contact?: string; email?: string; phone?: string }) {
    this.track('identify', {
      metadata: lead,
    });
  }

  public trackSearch(query: string, resultsCount: number, category?: string) {
    if (!query || query.trim().length === 0) return;
    this.track('search', {
      metadata: {
        query: query.trim(),
        resultsCount,
        zeroResults: resultsCount === 0,
        category,
      },
    });
  }

  public trackForm(action: 'start' | 'abandon' | 'submit', formName: string, metadata?: Record<string, any>) {
    this.track(`form_${action}`, {
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
