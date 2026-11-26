# MM Earthmovers — Phase 2 (P2) Release Notes

**Release Date:** November 27, 2026  
**Branch / Baseline:** `main` (builds on P0 `0b82465` and P1 `5e49111`)  
**Release Scope (`15` IDs):** `BI-04`, `BI-05`, `BI-07`, `BI-08`, `BI-09`, `OBS-01`, `OBS-02`, `OBS-04`, `OBS-05`, `OBS-06`, `OBS-07`, `OBS-08`, `PROD-08`, `PROD-09`, `BUG-13`  
**Explicitly Deferred / Excluded:** `PROD-02` (UI replacement for imageless `"Coming Soon"` cards), `PROD-04` (reducing splash screen timers), CRM workflows (`analytics_lead_events`), and all P3 items (`BI-10`, `PROD-03`, `PROD-07`, `PROD-10`, `BUG-15`).

---

## 1. Non-Technical Summary (Business, Sales & Operations)

Phase 2 (**P2**) adds silent behavioral measurement across your website and upgrades `/admin/analytics` with deeper buyer intelligence, system health visibility, and a faster mobile admin experience—**without altering the customer-facing layout or opening animation**.

### What Stayed Unchanged for Website Visitors
- **Opening Splash Screen (`P2-A` Track-Only):** Visitors still experience the exact same `3s`–`12s` splash animation on homepage arrival. P2 silently measures how long visitors wait, how often the `12s` fallback triggers, and how often users leave before dismissal so any future speedup (`P2-B`) is backed by real data.
- **Missing-Photo `"Coming Soon"` Cards (`Option 2B` Admin-Only):** Products without photos (`16` catalog items) and the Excavator category (`0` products listed) keep their exact existing dark `"Coming Soon"` appearance across catalog grids, machine hubs, and product pages.
- **No CRM Bloat:** Enquiry capture remains lightweight usage and funnel measurement—no sales pipeline statuses or CRM tabs were added.

### New Capabilities in `/admin/analytics`
1. **Catalog Gaps & Excavator Demand Rankings (`BI-04`)**
   - Ranks photo-less products by actual buyer impressions, clicks, pageviews, and WhatsApp enquiry clicks inside **Product Demand** so your team knows which warehouse parts to photograph first.
   - Tracks total Excavator category pageviews, searches, and banner clicks to quantify unmet Excavator demand.
2. **Merchandising & Recommendation Lift (`BI-05`)**
   - Measures buyer engagement with product image lightbox zooms (opens, closes, viewing duration), **Product Details** technical specification toggles, machine model badge clicks, and **"Similar Products"** cross-sell transitions (including assisted enquiries).
   - Counts homepage hero video plays, switches (auto/prev/next/dot/swipe), and completions.
3. **International Export Funnel & Machine Hub Analytics (`BI-07`, `BI-08`)**
   - Tracks how often international visitors see the export shipping banner by country vs click through to WhatsApp, alongside comparisons between server-side and client-side (`ipapi.co`) location detection.
   - Breaks down traffic and downstream part conversion across all **10 Machine Model hubs**, top opened FAQ questions, and switches between sibling machine models.
4. **First-Time vs Repeat Fleet Buyer Cohorts (`BI-09`)**
   - Segments buyers into `1`-session, `2`-session, and `3+`-session repeat fleet cohorts, compares Day-1 vs Return-Day WhatsApp conversion rates, tracks 7-day repeat rate, and attributes repeat buyers to their original first-touch source.
5. **New `Ops & Audit` Tab & Faster Mobile Dashboard (`OBS-01..08`, `PROD-08`, `PROD-09`)**
   - **Faster Dashboard Polling:** Split the monolithic `8,800+`-line admin page into modular components. The dashboard now refreshes **only the active tab** you are viewing and pauses background polling when the browser tab is hidden or minimized. Visitors are paginated cleanly server-side beyond the old list limits.
   - **Broken Links (`404`) & Browser Errors:** Lists broken URLs buyers tried opening (including any OEM part numbers inferred from the URL) and JavaScript runtime crashes (`window.onerror`, Promise rejections, and React error boundaries).
   - **Telemetry Retry Resilience:** If a visitor's network drops or the database hiccups, telemetry batches are queued locally in their browser and automatically retried when connectivity returns.
   - **Alert Deduplication & Security Audit Log:** Confirms zero duplicate Sentinel alerts across serverless cold starts and displays the paginated audit log of admin logins, restriction edits, and Sentinel flags alongside live Edge middleware block counts (`307` redirects and `200 []` empty API responses).

---

## 2. Technical Changelog (Engineering)

### A. Storefront & Client Instrumentation
- **Tracker SDK & Retry Resilience ([lib/analytics/tracker.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/tracker.ts)):**
  - Enforced outgoing batch payload splitting (`MAX_TELEMETRY_UPLOAD_BYTES = 49152` bytes / `48 KB`) to stay safely below the `64 KB` server ingest cap (`MAX_TELEMETRY_BODY_BYTES = 65536`).
  - Added localStorage offline retry queue (`RETRY_QUEUE_STORAGE_KEY = 'mm_retry_queue'`, FIFO capped at `MAX_RETRY_QUEUE_EVENTS = 50`) for network errors, `429`, and `>= 500` responses with exponential backoff (`2s`, `8s`, `30s`).
  - Added UTF-16 surrogate-pair-safe string clamping (`safeSlice`, `sanitizeOversizedEvent`) so truncating long error messages or metadata never creates malformed Unicode.
  - Added `client_ops`, `placeholder_impression`, `image_zoom`, `spec_toggle`, `related_product_click`, `export_banner_view`, `model_faq_accordion_toggle`, `model_sibling_switcher_card`, `loading_screen_timing`, `client_error`, `not_found`, `video_play`, and `video_complete` event support.
- **Silent Catalog & Engagement Sensors:**
  - [ProductsPage.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ProductsPage.tsx) & [ModelProductGrid.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ModelProductGrid.tsx): Added `IntersectionObserver`-based `placeholder_impression` tracking (`catalog_card`) deduped per session/SKU in `sessionStorage`, plus `ProductsPage` search tracking hygiene (`lastTrackedQueryRef`).
  - [ProductImageZoom.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ProductImageZoom.tsx): Tracks `placeholder_impression` (`detail_hero` / `lightbox`) on imageless SKUs without changing the `"Coming Soon"` UI, and tracks lightbox `image_zoom` open/close durations (`durationMs`).
  - [ProductDetailsAccordion.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ProductDetailsAccordion.tsx) & [app/products/[category]/[slug]/page.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/products/%5Bcategory%5D/%5Bslug%5D/page.tsx): Tracks `<details>` spec toggles (`spec_toggle`) and `"Similar Products"` recommendations (`related_product_click` with source/target slugs & position).
  - [ModelFaqAccordion.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ModelFaqAccordion.tsx) & [app/models/[slug]/page.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/models/%5Bslug%5D/page.tsx): Extracted `'use client'` FAQ accordion using React `onToggle` (`model_faq_accordion_toggle`) and enriched `model_sibling_switcher_card` metadata (`data-source-machine-slug`, `data-target-machine-slug`, `data-position`).
  - [ExportInfo.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ExportInfo.tsx) & [hooks/useGeoLocation.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/hooks/useGeoLocation.ts): Tracks `export_banner_view` once per session/page for international sessions; deduplicates in-flight `ipapi.co` requests (`5000ms` timeout) and emits one-per-session `client_ops` SLA telemetry.
  - [VideoCarousel.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/VideoCarousel.tsx): Tracks `video_play` and `video_complete` with trigger attribution (`auto`, `prev`, `next`, `dot`, `swipe`).
  - [HomeClient.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/HomeClient.tsx): Emits single `loading_screen_timing` payload (`waitDurationMs`, `hitFallback12s`, `dismissedNormally`, `bouncedBeforeDismiss`, `isMobile`) while leaving `minTimeTimer` (`3000ms`) and `fallbackTimeout` (`12000ms`) unchanged.
  - [AnalyticsProvider.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/AnalyticsProvider.tsx), [app/error.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/error.tsx), & [app/not-found.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/not-found.tsx): Captures global `window.onerror` / `unhandledrejection` and React Error Boundary crashes (`client_error`) plus broken links (`not_found` with `inferredPartNumber`).

### B. Backend Pipeline, Edge Middleware & Operational Observability
- **Request-Scoped Ops Telemetry ([lib/analytics/ops.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/ops.ts)):**
  - `AsyncLocalStorage`-backed metric collector (`withOpsMetric`, `recordOpsMetric`, `flushOpsMetrics`, `runDetachedOpsContext`) flushes accumulated `ingest_batch`, `api_request`, `db_query`, `external_call`, and `catalog_cache` records in one batched `INSERT INTO analytics_ops_metrics` query per request without recursive self-instrumentation.
- **API & External Integration Wrapping:**
  - Instrumented [app/api/analytics/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/api/analytics/route.ts), [app/api/leads/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/api/leads/route.ts) (`StaticForms`), [app/api/products/search/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/api/products/search/route.ts), [app/api/flags/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/api/flags/route.ts), [app/api/restrictions/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/api/restrictions/route.ts), [lib/analytics/geo.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/geo.ts) (`ip-api.com`), [lib/analytics/alert.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/alert.ts), and [lib/products.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/products.ts) (`catalog_cache` hit/miss telemetry).
- **Ingestion & Decoder Hardening ([lib/analytics/ingestHandler.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/ingestHandler.ts), [lib/analytics/encoder.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/encoder.ts)):**
  - Splits `client_ops` events exclusively to `analytics_ops_metrics` before behavioral event storage.
  - Wraps background Sentinel flag evaluation in `runDetachedOpsContext`.
  - Records batch outcomes (`ok`, `rejected`, `error`) and returns sanitized `500 { error: 'Internal error' }` on DB errors.
  - Fixes JSON fallback decoding (`tryDecodePayload` + `expandEvent`) with key-collision safety and primitive rejection (`BUG-13`).
- **Persistent Alert Dedupe & Delivery Logging ([lib/analytics/alert.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/alert.ts)):**
  - Added PostgreSQL-backed `checkAndRecordDedupeDb` and `logAlertDelivery` writing `sent`, `failed`, and `deduplicated` records to `analytics_alert_deliveries` (`60`-minute window) with L1 fast-path and safe DB fallback.
- **Edge Restriction Telemetry ([middleware.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/middleware.ts), [app/api/internal/ops-block/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/api/internal/ops-block/route.ts)):**
  - Edge middleware emits non-blocking block metrics (`307` redirects and `200 []` empty API responses) via `event.waitUntil(fetch('/api/internal/ops-block'))`, authenticated with Edge `crypto.subtle` HMAC secret (`x-internal-secret`) and Node `crypto.timingSafeEqual` on the receiver—keeping `pg` and Node `crypto` completely out of the Edge bundle.

### C. Analytics Query Engine & Admin Dashboard Modularization
- **Shared Clustering Helper ([lib/analytics/clusters.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/clusters.ts)):** Unified industrial buyer cluster classification (`mining`, `infra`, `oem_quarry`) extracted from inline UI helpers (`BUG-13`).
- **Aggregation Engine ([lib/analytics/stats.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/stats.ts)):**
  - Added `productEngagementStats`, `exportFunnelStats`, `modelHubStats`, `cohortRetentionStats`, `catalogHealthGaps` (via `getProductEnquiryPerformance`), `getOpsHealthStats`, and paginated `getAuditLogs`.
  - Upgraded `getVisitorsList` to server-side pagination, search, segment, and device filtering (`VisitorsListResult` with `visitors`, `totalCount`, and `summaryCounts`), clamping `limit` (`[1, 500]`) and `offset` (`[0, 1_000_000_000]`).
- **Modular Admin Architecture (`app/admin/analytics/`):**
  - Refactored `app/admin/analytics/page.tsx` from `8,800+` lines down to `363` lines orchestrating 7 tabs (`stream`, `products`, `audience`, `demand`, `visitors`, `restrictions`, `ops`).
  - Extracted `_components/` (`DashboardHeader`, `KpiStrip`, `LiveStreamTab`, `ProductDemandTab`, `ProductInspectorDrawer`, `AudienceGeoTab`, `SearchDwellTab`, `VisitorsTab`, `OpsHealthTab`, `RestrictionsTab`, `VisitorJourneyModal`), `_hooks/` (`useAnalyticsPolling`, `useAnalyticsActions`), `_types/` (`analytics.ts`), and `_utils/` (`chartHelpers`, `formatters`, `journeyHelpers`).
  - `useAnalyticsPolling` polls `summary` + only the currently active tab and automatically pauses background refreshes when `document.visibilityState !== 'visible'` (`PROD-08`).

---

## 3. Breaking Changes, Contract Changes & Upgrade Notes

| Area | Change in P2 | Compatibility / Migration Impact |
|---|---|---|
| **Telemetry Ingest Error Status (`POST /api/analytics`, `POST /api/collect`)** | `ingestTelemetryRequest` ([lib/analytics/ingestHandler.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/ingestHandler.ts#L298-L331)) now returns **HTTP `500` `{ error: 'Internal error' }`** on database/ingest failures instead of swallowing errors as HTTP `204`. | **Behavior Change:** Required so the SDK's offline `mm_retry_queue` detects transient DB failures and retries with backoff. Any external consumer assuming `/api/collect` always returns `204` during DB outages will now receive `500`. |
| **`visitors` API Response (`POST` & `GET /api/analytics?view=visitors`)** | `getVisitorsList` now returns `{ visitors, totalCount, summaryCounts }` instead of a flat array (`{ visitors: [...] }` wrapper now also includes top-level `totalCount` & `summaryCounts`), with `limit` clamped to `[1, 500]`. | **Minor Contract Extension:** Callers reading `response.visitors` remain compatible; any internal TypeScript caller expecting `getVisitorsList()` to resolve directly to `any[]` must use `.visitors` (`VisitorsListResult`). `getVisitorsList` still accepts legacy positional `(limit, offset, timeRange)` args. |
| **JSON Telemetry Fallback Validation ([lib/analytics/encoder.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/encoder.ts))** | Plain JSON telemetry inputs now reject non-object primitives (`400 decode_failed`) and expand compact keys via `expandEvent` (preserving explicit full keys when both exist). | **Stricter Validation:** Malformed primitive JSON strings can no longer bypass decode checks; raw JSON payloads with compact aliases (`v`, `t`, etc.) normalize identically to XOR-obfuscated payloads. |
| **`client_ops` Routing ([lib/analytics/ingestHandler.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/ingestHandler.ts#L188-L240))** | Events with `eventType: 'client_ops'` write solely to `analytics_ops_metrics` and do **not** create rows in `analytics_events`. | **Non-Breaking / Expected:** Keeps client SLA probes out of user session engagement timelines. |
| **Machine FAQ Accordion Attribute ([app/models/[slug]/page.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/models/%5Bslug%5D/page.tsx))** | `<details>` FAQ items are now rendered by `<ModelFaqAccordion>` using React `onToggle`; the `data-track="model_faq_accordion_toggle"` HTML attribute was removed from `<details>` to stop global click auto-tracking from double-firing `'click'`. | **DOM Selector Note:** Automated scripts or tests querying `[data-track="model_faq_accordion_toggle"]` should target the FAQ summary/details elements directly (`tests/e2e/tier5-p2-coverage.test.mjs` covers this). |
| **Admin Source File Split (`app/admin/analytics/page.tsx`)** | Logic previously inside monolithic `app/admin/analytics/page.tsx` now lives in `app/admin/analytics/_components/**`, `_hooks/**`, `_types/**`, and `_utils/**`. | **URLs Unchanged:** `/admin/analytics` route and all 6 existing tab IDs are intact, plus the new `'ops'` tab (`Ops & Audit`). Static source analyzers scanning only `page.tsx` must include `_components/**` (updated in `tests/e2e/analyzer.mjs`). |
| **Database Schema & Environment Variables** | No new database tables needed (`analytics_ops_metrics`, `analytics_alert_deliveries`, `analytics_audit_logs` were provisioned in P0). No new environment variables added. | **Drop-in Deployment:** Existing production `.env` (`DATABASE_URL`, `ADMIN_ANALYTICS_KEY`) works with zero config changes or SQL migrations. |

---

## 4. Verification Summary (Pre-Release Gate)

- **TypeScript (`npm run type-check`):** Passed (`tsc --noEmit`).
- **ESLint (`npm run lint`):** Passed with `0` errors (pre-existing `@next/next/no-img-element` and `ProductsPage.tsx` warnings only).
- **Production Build (`npm run build`):** Passed (`166/166` static pages generated; `/admin/analytics` `62.3 kB` / `151 kB`; `Middleware` `44.3 kB`).
- **Edge Bundle Isolation (`.next/server/middleware.js`):** `186,747` bytes — verified `crypto.subtle` and `/api/internal/ops-block` present; `pg` and Node `crypto` absent.
- **Sequential Analytics Suites (`node --test --test-concurrency=1 ...`):** **`43/43` passed** across `9` suites (`0` failed, `0` skipped — covering `nuisance-flagging.test.mjs`, `p0-release.test.mjs`, `p1-release.test.mjs`, and `p2-release.test.mjs`).
- **E2E Suite (`node tests/e2e/runner.mjs`):** **`44/44` passed** (`0` failed — Tiers 1–4 `36/36` legacy mobile coverage + Tier 5 `8/8` P2 coverage).
- **PostgreSQL Baseline:** Verified clean post-test database state across all `10` `analytics_*` tables (`0` synthetic test rows remaining; `analytics_lead_events` `0` rows).
