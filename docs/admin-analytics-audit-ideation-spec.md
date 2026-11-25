# MM Earthmovers — `admin/analytics`, Telemetry & Product Flows Audit, Ideation Plan, and Implementation-Ready Technical Specification

**Target Repository:** `c:\portfolio\mm-earthmovers-final\mm-earthmovers`  
**Document Status:** Revamped Plan & Technical Specification — **Usage & Product Analytics Only (No CRM)**; **P0 Implemented (`0b82465`)**, P1–P3 Planning  
**Primary Audience:** Engineering, Product, and Operations Leadership (`mm-earthmovers`, 1–5 person team)  
**Product Scope Context:** `mm-earthmovers` is operated by a lean 1–5 person team focused on gathering **12+ months of clean usage, catalog-demand, and funnel analytics** to understand buyer behavior over time. Sales CRM pipelines, lead status workflows, quote-value tracking, and response-SLA management are **explicitly out of scope**.  

---

## Table of Contents

1. [Executive Summary & Traceability Matrix](#1-executive-summary--traceability-matrix)
2. [Part 1 — Complete Audit of `admin/analytics`, Telemetry & Product Flows (R1)](#2-part-1--complete-audit-of-adminanalytics-telemetry--product-flows-r1)
   - [2.1 Architecture, Tech Stack & Codebase Inventory](#21-architecture-tech-stack--codebase-inventory)
   - [2.2 Database Tables & Schema Drift Audit](#22-database-tables--schema-drift-audit)
   - [2.3 Metric-by-Metric & Chart-by-Chart Audit of `admin/analytics`](#23-metric-by-metric--chart-by-chart-audit-of-adminanalytics)
   - [2.4 User-Facing Product Flows Audit](#24-user-facing-product-flows-audit)
   - [2.5 Admin & External Integration Flows Audit](#25-admin--external-integration-flows-audit)
   - [2.6 Verified Bugs, Security Defects, Performance Bottlenecks & Blind Spots](#26-verified-bugs-security-defects-performance-bottlenecks--blind-spots)
3. [Part 2 — Analytics & Observability Ideation Plan (R2)](#3-part-2--analytics--observability-ideation-plan-r2)
   - [3.1 Product & Business Insights (`BI-01` – `BI-10`)](#31-product--business-insights-bi-01--bi-10)
   - [3.2 Operational Observability (`OBS-01` – `OBS-09`)](#32-operational-observability-obs-01--obs-09)
4. [Part 3 — Concrete Product Improvements Plan (R3)](#4-part-3--concrete-product-improvements-plan-r3)
5. [Part 4 — Implementation-Ready Technical Specification (R4)](#5-part-4--implementation-ready-technical-specification-r4)
   - [4.1 Schema & Migrations Specification](#41-schema--migrations-specification)
   - [4.2 Correctness, Security & Restriction Fixes (`BUG-*`, `SEC-*`)](#42-correctness-security--restriction-fixes-bug-sec)
   - [4.3 Client SDK, Event Taxonomy & Storefront Instrumentation](#43-client-sdk-event-taxonomy--storefront-instrumentation)
   - [4.4 Backend API Contracts, Ingestion Resilience & External Integration Observability](#44-backend-api-contracts-ingestion-resilience--external-integration-observability)
   - [4.5 `admin/analytics` Modularization & New UI Tabs/Widgets](#45-adminanalytics-modularization--new-ui-tabswidgets)
   - [4.6 Point-by-Point Verification & Acceptance Test Plan](#46-point-by-point-verification--acceptance-test-plan)
6. [Part 5 — Prioritized Rollout Roadmap (P0–P3)](#6-part-5--prioritized-rollout-roadmap-p0p3)

---

## 1. Executive Summary & Traceability Matrix

`mm-earthmovers` is a Next.js `14.0.4` App Router B2B spare-parts catalog (`144` markdown products: `126` Loader, `18` Motor Grader, `0` Excavator; `10` machine model hubs) backed by Decap CMS (`/admin`), a custom first-party behavioral telemetry pipeline (`lib/analytics/tracker.ts` -> `/api/analytics` -> Supabase PostgreSQL), a behavioral competitor/scraper sentinel (`lib/analytics/flags.ts` + `lib/analytics/alert.ts`), and an IP/Visitor ID restriction system (`middleware.ts`, `lib/restrictions.ts`, `TargetedAssistanceModal.tsx`).

Direct source-level verification across every route, component, library, and SQL query revealed **four systemic problem clusters**:

1. **Metric & Schema Integrity Defects (`BUG-01` – `BUG-15`)**: `analytics_visitors.total_sessions` is frozen at `1` (`lib/analytics/db.ts:108-125`), breaking Repeat Fleet segmentation; `avgDurationSeconds` averages over event rows rather than sessions (`lib/analytics/stats.ts:58`); `pageDwellStats` averages `0`s from `pageview` events (`stats.ts:400-403`); product `views` fail to match URLs containing query strings (`stats.ts:785,793` vs `components/AnalyticsProvider.tsx:36`); `searchSummary` truncates at `LIMIT 30` (`stats.ts:287-303`); `scripts/init_analytics_db.js` omits `ip_address` columns and `analytics_restrictions`/`analytics_flags` tables; and `TargetedAssistanceModal.tsx:137-169` reports success even on StaticForms `4xx/5xx` responses.
2. **Security & Access-Control Asymmetries (`SEC-01` – `SEC-06`)**: `GET /api/flags` and `GET /api/restrictions` are completely unauthenticated; fallback admin key `'mmearth@2026'` and plaintext cookie storage exist in `lib/analytics/auth.ts` and `app/api/analytics/route.ts`; DB-added restrictions are enforced in `middleware.ts` and `TargetedAssistanceModal.tsx` but ignored by `AnalyticsProvider.tsx`, `Header.tsx`, `ProductCategories.tsx`, `GlobalSearchModal.tsx`, `/api/products/search`, `/api/analytics`, and `/api/collect`; and no admin audit log exists.
3. **Commercial Funnel & Product Blind Spots (`BI-01` – `BI-10`, `PROD-01` – `PROD-10`)**: Leads submitted via `Contact.tsx` and `TargetedAssistanceModal.tsx` depend exclusively on third-party StaticForms with zero first-party submission backup; outbound WhatsApp/Phone clicks lack placement attribution; GA4 (`G-RHFEC523K9`) receives zero conversion events; `VideoCarousel`, `ProductImageZoom`, `<details>` spec accordions, `getRelatedProducts` cards, `ExportInfo`, `LoadingScreen` blocking delays (3–12s), `404` URLs, `/add-review`, and form abandonment (`form_start`/`form_abandon`/validation errors) are untracked; and long-horizon trend views (`90d` / `1y` monthly aggregation) are missing for 12-month usage analysis.
4. **Operational & Performance Blind Spots (`OBS-01` – `OBS-09`)**: Telemetry errors return `204` silently; `app/admin/analytics/page.tsx` (`8,185` lines) polls 5 endpoints every 15s regardless of active tab/visibility; `getDashboardStats` runs 14 sequential queries on a `max: 4` pool; `getProductEnquiryPerformance` synchronously parses 144 `.md` files per poll; `heartbeat` rows crowd out `LIMIT 100`/`200` stream queries; and `alertDedupeCache` resets on serverless cold starts.

### Master Traceability Matrix

| ID | Category | Requirement | Summary | Target Files / Tables | Decision / Outcome Enabled | Priority |
|---|---|---|---|---|---|---|
| `BUG-01` | Integrity | R1 / R4 | Increment `analytics_visitors.total_sessions` only when a new `session_id` is inserted | `lib/analytics/db.ts` | Accurate Repeat Fleet (`2+`/`3+` sessions) targeting | **P0** |
| `BUG-02` | Integrity | R1 / R4 | Compute `avgDurationSeconds` over distinct sessions (`analytics_sessions`) | `lib/analytics/stats.ts` | True session engagement duration KPI | **P0** |
| `BUG-03` | Integrity | R1 / R4 | Compute `pageDwellStats.avg_dwell_seconds` from `section_view` events only (or `NULLIF`/session-page dwell) | `lib/analytics/stats.ts` | Accurate per-page reading depth | **P0** |
| `BUG-04` | Integrity | R1 / R4 | Strip query strings (`SPLIT_PART(page_path, '?', 1)`) in `getProductEnquiryPerformance` view matching | `lib/analytics/stats.ts`, `AnalyticsProvider.tsx` | Prevent UTM/fbclid traffic from showing 0 product views | **P0** |
| `BUG-05` | Integrity | R1 / R4 | Separate detail-page conversion vs total enquiry rate; add `baseAdminExclude` to `getProductEnquiryPerformance` | `lib/analytics/stats.ts` | Eliminate `>100%` conversion artifacts & bot pollution | **P1** |
| `BUG-06` | Integrity | R1 / R4 | Replace `Number(s.part_copies_count) \|\| copies` with nullish coalescing (`??`) | `lib/analytics/stats.ts` | Stop false `competitor_recon` on non-part text copies | **P0** |
| `BUG-07` | Integrity | R1 / R4 | Align `flags.ts` cumulative copy SQL with `isPartNumberCopy` semantics | `lib/analytics/flags.ts` | Reduce false-positive scraper alerts | **P1** |
| `BUG-08` | Integrity | R1 / R4 | Fix `chartTotals.totalVisitors` double-counting & align `timeSeries.leads` / geo `inquiries_count` predicates | `app/admin/analytics/page.tsx`, `lib/analytics/stats.ts` | Consistent visitor and lead totals across all cards | **P0** |
| `BUG-09` | Integrity | R1 / R4 | Compute `searchSummary` via uncapped aggregate SQL rather than `LIMIT 30` slice | `lib/analytics/stats.ts` | Accurate long-tail search volume & Catalog Gap Rate | **P1** |
| `BUG-10` | Integrity | R1 / R4 | Check `res.ok && data?.id` in `TargetedAssistanceModal.tsx` before marking success/tracking `form_submit` | `components/TargetedAssistanceModal.tsx` | Prevent silent lead loss on StaticForms errors | **P0** |
| `BUG-11` | Integrity | R1 / R4 | Fix `getWhatsAppTestUrl` phone (`919443228800` -> `+918334887009`) & add server query for Product Inspector events | `app/admin/analytics/page.tsx`, `lib/analytics/stats.ts`, `app/api/analytics/route.ts` | Accurate test link & full product event history | **P1** |
| `BUG-12` | Schema | R1 / R4 | Reconcile `scripts/init_analytics_db.js` with `ip_address`, `analytics_restrictions`, `analytics_flags`, and new tables | `scripts/init_analytics_db.js` | Reproducible fresh-environment DB bootstrap | **P0** |
| `BUG-13` | Integrity | R1 / R4 | Fix `decodePayload` unencoded `{v,t}` expansion, `ProductsPage` `lastTrackedQueryRef`, & unify cluster classifiers | `lib/analytics/encoder.ts`, `components/ProductsPage.tsx`, `app/admin/analytics/page.tsx` | Reliable search re-tracking & consistent cluster labels | **P2** |
| `BUG-14` | Performance | R1 / R4 | Exclude `heartbeat` from `getRecentEvents` default feed & flag eval; fix `geo.ts` RFC1918 `172.16-31` check | `lib/analytics/stats.ts`, `app/api/analytics/route.ts`, `lib/analytics/geo.ts` | Prevent 30s heartbeats from crowding out 100-event feeds | **P1** |
| `BUG-15` | Hygiene | R1 / R4 | Remove/resolve orphaned `deadClicks`, `topPages`, `products.json`, `AIPartsAssistant`, `ComingSoon`, unused props | `stats.ts`, `Contact.tsx`, `ProductsPage.tsx`, `lib/products.ts` | Eliminate dead metrics & maintenance confusion | **P3** |
| `SEC-01` | Security | R1 / R4 | Require `isAuthorized(req)` on `GET /api/flags` & `GET /api/restrictions`; sanitize `GET /api/analytics?check=status` | `app/api/flags/route.ts`, `app/api/restrictions/route.ts`, `app/api/analytics/route.ts` | Close public leak of flagged/restricted IPs & DB errors | **P0** |
| `SEC-02` | Security | R1 / R4 | Fail closed if `ADMIN_ANALYTICS_KEY` missing in prod; HMAC-signed cookie; move StaticForms/IndexNow/exemption secrets to env | `lib/analytics/auth.ts`, `app/api/analytics/route.ts`, `lib/analytics/flags.ts`, `app/api/indexnow/route.ts` | Eliminate hardcoded credentials & plaintext cookie | **P0** |
| `SEC-03` | Security | R1 / R4 | Split Edge-safe vs Node/PG restriction helpers; unify DB checks across `middleware.ts` (via `/api/internal/restrictions`), `/api/products/search`, ingest, & `GET /api/visitor-status` | `lib/restrictions-static.ts`, `lib/restrictions-server.ts`, `middleware.ts`, `app/api/internal/restrictions/route.ts`, `app/api/visitor-status/route.ts`, client components | Ensure admin-added DB rules apply everywhere without Edge `pg` breakage | **P0** |
| `SEC-04` | Security | R1 / R4 | Consolidate `/api/collect` & `/api/analytics` ingest handler with bot-UA filter, payload caps, raw-fallback validation, and strict origin policy | `app/api/analytics/route.ts`, `app/api/collect/route.ts`, `lib/analytics/ingestHandler.ts` | Eliminate ingest drift & bot/flood exposure | **P1** |
| `SEC-05` | Security | R1 / R4 | Validate `message.origin` in GitHub OAuth `/api/callback` (allowing `window.location.origin`, Vercel previews, & `127.0.0.1:3000`) before `postMessage` token | `app/api/callback/route.ts` | Prevent OAuth token exfiltration to untrusted openers | **P0** |
| `SEC-06` | Security | R2 / R4 | Add `analytics_audit_logs` & login rate limiting | `analytics_audit_logs`, `app/api/analytics/route.ts`, `flags/route.ts`, `restrictions/route.ts` | Accountability for blocks, flags & auth attempts | **P1** |
| `BI-01` | Insights | R2 / R4 | Enquiry & Form Attribution + 1-Year Trend Lenses (`90d`/`1y` monthly series, immutable `analytics_leads` backup log without CRM, correlated with outbound WA/Tel intent) | `analytics_leads`, `app/api/leads/route.ts`, `lib/analytics/stats.ts` | Measure true enquiry volume by channel/page/city over 12 months (no CRM bloat) | **P1** |
| `BI-02` | Insights | R2 / R4 | Granular Enquiry Placement Attribution (`data-placement` across all 18 WhatsApp/Tel/Email/Maps CTAs) | `tracker.ts`, storefront CTAs, `stats.ts`, `ProductDemandTab` | Identify highest-ROI page placements & CTAs | **P1** |
| `BI-03` | Insights | R2 / R4 | Search-to-Gap-to-Lead Recovery Funnel, Rank CTR & Keyboard vs Mouse Selection | `GlobalSearchModal`, `ProductsPage`, `ModelProductGrid`, `stats.ts`, `SearchDwellTab` | Prioritize uncataloged SKUs with real buyer recovery | **P1** |
| `BI-04` | Insights | R2 / R4 | Catalog Health: Missing-Photo (`16` SKUs) Impressions/Photo-Requests & Excavator (`0` SKUs) Demand Intelligence | `ProductImageZoom`, `ProductPlaceholderImage`, `ProductsPage`, `stats.ts`, `ProductDemandTab` | Guide warehouse photography & Excavator SKU onboarding | **P2** |
| `BI-05` | Insights | R2 / R4 | Spec Accordion, Image Zoom & `getRelatedProducts` Attribution | `ProductImageZoom.tsx`, `app/products/[category]/[slug]/page.tsx`, `stats.ts`, `ProductInspectorDrawer` | Measure merchandising & cross-sell recommendation lift | **P2** |
| `BI-06` | Insights | R2 / R4 | Form Funnel (`form_start`, `form_abandon`, `form_validation_error`, `form_submit_error`) | `Contact.tsx`, `TargetedAssistanceModal.tsx`, `tracker.ts`, `stats.ts`, `SearchDwellTab` | Reduce enquiry drop-off and catch field UX friction | **P1** |
| `BI-07` | Insights | R2 / R4 | Export & International Buyer Funnel (`ExportInfo` impression + CTA + server vs `ipapi.co` Geo check) | `ExportInfo.tsx`, `useGeoLocation.ts`, `stats.ts`, `AudienceGeoTab` | Quantify export corridor demand & geo accuracy | **P2** |
| `BI-08` | Insights | R2 / R4 | Machine Hub, FAQ `<details>` Wrapper & Model-to-Part Conversion Attribution | `app/models/[slug]/page.tsx`, `ModelFaqAccordion.tsx`, `ModelProductGrid.tsx`, `stats.ts`, `SearchDwellTab` | Optimize OEM machine hub SEO & compatibility matching | **P2** |
| `BI-09` | Insights | R2 / R4 | Cohort Repeat Fleet & Return-Day Conversion Lift + First-Touch Attribution | `lib/analytics/db.ts`, `lib/analytics/stats.ts`, `VisitorsTab` | Distinguish casual browsers from repeat fleet buyers | **P2** |
| `BI-10` | Insights | R2 / R4 | GA4 Dual-Dispatch Parity (`/admin/*` excluded via client wrapper) & `/add-review` Redirect Telemetry | `lib/analytics/ga4.ts`, `components/TelemetryScripts.tsx`, `app/layout.tsx`, `app/add-review/route.ts` | Sync Google Ads/GA4 conversions & track review QR/links | **P3** |
| `OBS-01` | Ops | R2 / R4 | Ingestion Pipeline Health, Drop Counters & Byte-Chunked Client Retry Queue | `analytics_ops_metrics`, `tracker.ts`, `lib/analytics/ingestHandler.ts` | Detect silent telemetry loss instead of blind `204` | **P2** |
| `OBS-02` | Ops | R2 / R4 | API Route Latency, Status Codes & Error Budget Monitoring | `lib/analytics/ops.ts`, `analytics_ops_metrics`, API route wrappers | Track p50/p95/5xx across `/api/*` endpoints | **P2** |
| `OBS-03` | Ops | R2 / R4 | DB Pool/Query Latency Observability + Consolidated CTEs (`max: 4` safe) & `getProducts()` Cache (`catalog_cache`) | `lib/analytics/db.ts`, `lib/analytics/stats.ts`, `lib/products.ts`, `analytics_ops_metrics` | Prevent pool exhaustion (`max: 4`) & 144-file sync reads | **P1** |
| `OBS-04` | Ops | R2 / R4 | External Integration SLA Tracking (`StaticForms`, `ip-api`, `ipapi.co` via `client_ops`, `Resend`, `ntfy`, `IndexNow`, `OAuth`) | `lib/analytics/ops.ts`, `geo.ts`, `alert.ts`, `api/leads`, `hooks/useGeoLocation.ts` | Spot third-party outages & rate-limit throttling | **P2** |
| `OBS-05` | Ops | R2 / R4 | Persistent Alert Deduplication & Delivery Log (`analytics_alert_deliveries`) | `lib/analytics/alert.ts`, `analytics_alert_deliveries` | Stop duplicate Sentinel alerts across cold starts | **P2** |
| `OBS-06` | Ops | R2 / R4 | Client Runtime Errors (`window.onerror`, `unhandledrejection`, `error.tsx`) & `404` Broken-Link Telemetry | `AnalyticsProvider.tsx`, `app/error.tsx`, `app/not-found.tsx`, `analytics_events`, `OpsHealthTab` | Catch client crashes & broken inbound backlinks | **P2** |
| `OBS-07` | Ops | R2 / R4 | `LoadingScreen` Splash Gate Latency & Pre-Dismiss Bounce Telemetry | `HomeClient.tsx`, `LoadingScreen.tsx`, `VideoCarousel.tsx`, `analytics_events`, `OpsHealthTab` | Quantify LCP/bounce cost of 3–12s video preloader | **P2** |
| `OBS-08` | Ops | R2 / R4 | Edge Restriction Cache Hit/Block Metrics via `event.waitUntil` -> `/api/internal/ops-block` | `middleware.ts`, `app/api/internal/ops-block/route.ts`, `analytics_ops_metrics` | Verify block enforcement & cache freshness | **P2** |
| `OBS-09` | Ops | R2 / R4 | Admin Security & Audit Trail (`analytics_audit_logs`) | `analytics_audit_logs`, `app/api/analytics/route.ts`, `flags/route.ts`, `restrictions/route.ts`, `OpsHealthTab` | Full auditability of admin mutations & auth | **P1** |
| `PROD-01` | Product | R3 / R4 | Resilient First-Party `/api/leads` Form Proxy, Immutable Backup Log & StaticForms Failover (No CRM) | `app/api/leads/route.ts`, `Contact.tsx`, `TargetedAssistanceModal.tsx` | Zero lost enquiries + removes client `accessKey` exposure without CRM bloat | **P1** |
| `PROD-02` | Product | R3 / R4 | Consistent `ProductPlaceholderImage` + Tracked Photo-Request CTA (`placeholder_photo_wa`) | `ProductsPage.tsx`, `ModelProductGrid.tsx`, `ProductImageZoom.tsx`, `app/products/[category]/[slug]/page.tsx` | Convert missing-photo views into WhatsApp photo leads | **P2** |
| `PROD-03` | Product | R3 / R4 | Gap-to-CMS Actionable Workflow (Deep-link Zero-Result Searches & Cold SKUs to `/admin`) | `SearchDwellTab`, `ProductDemandTab` | Close catalog gaps faster using real buyer demand | **P3** |
| `PROD-04` | Product | R3 / R4 | Non-Blocking Hero Media & <=1.5s `LoadingScreen` Cap | `HomeClient.tsx`, `LoadingScreen.tsx`, `VideoCarousel.tsx` | Improve LCP and eliminate 3–12s bounce risk | **P2** |
| `PROD-05` | Product | R3 / R4 | Edge/Server Split Restriction Architecture & Privacy-Safe `GET /api/visitor-status` | `lib/restrictions-static.ts`, `lib/restrictions-server.ts`, `middleware.ts`, `api/internal/restrictions`, `api/visitor-status` | Consistent access control without exposing blocklist or breaking Edge | **P0** |
| `PROD-06` | Product | R3 / R4 | Auth, Secret & OAuth Hardening | `lib/analytics/auth.ts`, `api/*` | Production-grade admin & CMS security posture | **P0** |
| `PROD-07` | Product | R3 / R4 | Dead Code, Unused Field & Duplicated Classifier Cleanup | `lib/products.ts`, `public/products.json`, `AIPartsAssistant.tsx`, `app/api/collect` | Lower maintenance burden and eliminate phantom UI | **P3** |
| `PROD-08` | Product | R3 / R4 | Decompose `app/admin/analytics/page.tsx` (8,185 lines) + Tab-Scoped Visible Polling + CTE Consolidation | `app/admin/analytics/_components/*`, `lib/analytics/stats.ts` | Cut DB load by ~80% and enable rapid feature delivery | **P2** |
| `PROD-09` | Product | R3 / R4 | Add Lightweight `Ops & Audit` Tab in `/admin/analytics` (CRM Tab Removed as Out of Scope) | `OpsHealthTab.tsx` | Monitor telemetry health, `404`s, splash latency & admin audit logs | **P2** |
| `PROD-10` | Product | R3 / R4 | GA4 Conversion Helper (`/admin/*` excluded) & `/add-review` Redirect Logging | `lib/analytics/ga4.ts`, `components/TelemetryScripts.tsx`, `app/add-review/route.ts` | Enable ad-spend ROAS and review funnel tracking | **P3** |

---

## 2. Part 1 — Complete Audit of `admin/analytics`, Telemetry & Product Flows (R1)

### 2.1 Architecture, Tech Stack & Codebase Inventory

- **Framework & Language:** Next.js `14.0.4` App Router, React `^18.2.0`, TypeScript `^5.3.3` (`strict: true` in `tsconfig.json`), Tailwind CSS `^3.3.6` (`package.json:19-41`). Zero third-party charting libraries (charts in `/admin/analytics` are hand-coded SVG/CSS) and zero Server Actions (`"use server"` is absent across the codebase).
- **Database & Runtime:** `pg` `^8.23.1` direct pool (`max: 4`, `idleTimeoutMillis: 10000`, `connectionTimeoutMillis: 10000`) targeting Supabase PostgreSQL (`lib/analytics/db.ts:1-48`). No ORM.
- **Third-Party Telemetry & Utilities:** `@vercel/analytics` `^1.6.1` (`app/layout.tsx:8,179`), Google Analytics 4 `G-RHFEC523K9` (`app/layout.tsx:159-170`), `ua-parser-js` `^2.0.10`, `gray-matter` `^4.0.3` (144 markdown files in `content/products/`), `lottie-react` `^2.4.1`, `three` `^0.180.0` (listed in `package.json:18,28`, unused in active routes).

| Layer | File Path | Key Symbols & Line Ranges | Verified Behavior |
|---|---|---|---|
| **Dashboard UI** | `app/admin/analytics/page.tsx` | `AnalyticsDashboardPage` (`224-8185`), 6 tabs (`stream`, `products`, `audience`, `demand`, `visitors`, `restrictions`), 3 modals (`inspectedProduct` `4059-4270`, `selectedVisitorId` `7468-8075`, `isAddIpModalOpen` `8078-8182`) | Monolithic `'use client'` page. No `app/admin/layout.tsx`, `loading.tsx`, or `error.tsx`. Fires 5 parallel `POST /api/analytics` requests on mount, `timeRange` change, and every `15,000 ms` (`589-610`). |
| **Unified Analytics API** | `app/api/analytics/route.ts` | `handleTelemetryIngest` (`17-116`), `OPTIONS` (`121-133`), `POST` (`140-274`), `GET` (`276-317`) | `force-dynamic`, `nodejs`. Dual-purpose: ingests `{ d }` or `{ v, t }` telemetry (returns `204` even on errors) and serves authenticated admin views (`summary`, `catalog`, `events`, `visitors`, `restrictions`) + actions (`login`, `logout`, `add_restriction`, `remove_restriction`). Public `GET ?check=status` runs `SELECT 1`. |
| **Duplicate Collector API** | `app/api/collect/route.ts` | `OPTIONS` (`12-24`), `POST` (`26-130`) | Duplicate ingestion handler missing UA bot regex (`analytics/route.ts:20-27`). Unused by `tracker.ts:38`. |
| **Flags API** | `app/api/flags/route.ts` | `GET` (`8-25`), `POST` (`27-58`) | `GET` returns all `analytics_flags` **unauthenticated** (`s-maxage=10`). `POST` (`add`/`remove`) checks `isAuthorized(req)`. |
| **Restrictions API** | `app/api/restrictions/route.ts` | `GET` (`8-41`), `POST` (`43-71`) | `GET` returns `{ visitorIds, ips, records }` **unauthenticated** (`s-maxage=15`). `POST` (`add`/`remove`) checks `isAuthorized(req)`. |
| **Auth Helper** | `lib/analytics/auth.ts` | `ADMIN_COOKIE_NAME` (`3`), `isAuthorized` (`5-34`) | Checks `ADMIN_ANALYTICS_KEY` (fallback `'mmearth@2026'`) via `Authorization: Bearer`, `mm_analytics_auth` cookie, or `?key=` on `localhost`/`127.0.0.1`. |
| **DB & Ingestion** | `lib/analytics/db.ts` | `getDbPool` (`5-42`), `query` (`44-48`), `ingestEvents` (`84-226`), `getRestrictions`/`addRestriction`/`removeRestriction` (`236-272`), `getFlags`/`addFlag`/`removeFlag` (`283-327`) | Translates `db.ueojvtnxtilbtolhcuhu.supabase.co` to IPv4 pooler port `6543`. Transactional batch upsert/insert across `analytics_visitors`, `analytics_sessions`, `analytics_events`. |
| **Stats Aggregations** | `lib/analytics/stats.ts` | `getTimeCondition` (`7-21`), `getDashboardStats` (`23-536`), `getRecentEvents` (`538-642`), `getVisitorsList` (`644-718`), `getProductEnquiryPerformance` (`733-888`) | Executes 14 sequential SQL queries in `getDashboardStats` + joins filesystem `getProducts()` (144 `.md` files). |
| **Client SDK & Provider** | `lib/analytics/tracker.ts`, `components/AnalyticsProvider.tsx` | `AnalyticsTracker` (`33-490`), `getTracker` (`495-500`), `AnalyticsProvider` (`8-48`) | Generates `mm_vid` (`localStorage` + 1yr cookie) and `mm_sid` (30m sliding `sessionStorage`). Tracks `pageview`, `click`, `rage_click`, `copy`, `section_view` (`dwellSeconds >= 2`), `heartbeat` (30s), `search`, `identify`, `form_submit`. |
| **Encoder & Geo** | `lib/analytics/encoder.ts`, `lib/analytics/geo.ts` | `encodePayload`/`decodePayload` (`68-111`), `extractGeolocation` (`60-146`) | Key map + XOR (`0x5a + (i % 7)`) + `encodeURIComponent` + Base64. Geo reads Cloudflare/Vercel headers, falling back to `http://ip-api.com/json/{ip}` (1500ms timeout, `ipGeoCache` max 2000). |
| **Sentinel Flag & Alert** | `lib/analytics/flags.ts`, `lib/analytics/alert.ts` | `isPartNumberCopy` (`58-125`), `hasConversionIntent` (`130-153`), `isBhuvanExempt` (`158-179`), `evaluateBehavioralSignature` (`184-231`), `evaluateAndRecordFlag` (`239-403`), `dispatchAlert` (`285-385`) | Evaluates scraper heuristics (`mass_part_harvester`, `catalog_recon_dwell`, `krishnagiri_opera_nuisance`), writes `'competitor'` to `analytics_flags` (never `analytics_restrictions`), and dispatches `ntfy.sh`, Resend, or Webhook alerts with 60-min in-memory dedupe (`alertDedupeCache`). |
| **Edge & Static Guard** | `middleware.ts`, `lib/restrictions.ts` | `middleware` (`41-75`), `RESTRICTED_VISITOR_IDS` (`lib/restrictions.ts:9-11`), `isRestrictedVisitor` (`16-19`) | Middleware (Next.js Edge Runtime) matches `/products*`, `/models*`, `/api/products*`; fetches `/api/restrictions` (15s cache, unauthenticated); redirects `307` to `/#contact` or returns `200 []`. |
| **Storefront Route Entry & Sitemap** | `app/products/page.tsx`, `app/sitemap.ts`, `components/ClientHeaderWrapper.tsx` | `Page` (`app/products/page.tsx:28-59`), `sitemap` (`app/sitemap.ts:6-77`), `ClientHeaderWrapper` (`1-39`) | SSR catalog entry reads `getProducts()` and `searchParams.category`; `ClientHeaderWrapper` bridges App Router `pathname` to `Header` (`activeSection`); `sitemap.ts` outputs `/`, `/products`, 3 categories, `144` products, `/models`, and `10` machine hubs. |
| **DB Scripts & Tests** | `scripts/init_analytics_db.js`, `scripts/check_db.js`, `tests/analytics/nuisance-flagging.test.mjs` | `run` (`init_analytics_db.js:16-101`), 5-tier test suite (`nuisance-flagging.test.mjs`) | `init_analytics_db.js` creates 3 tables + 5 indexes (out of sync with `db.ts`). `nuisance-flagging.test.mjs` runs 15 passing tests. |

### 2.2 Database Tables & Schema Drift Audit

`scripts/init_analytics_db.js:31-91` is the sole DDL script in the repository, yet it defines only **3 tables** and omits columns and tables required at runtime by `lib/analytics/db.ts` and `lib/analytics/stats.ts`:

| Table | `init_analytics_db.js` Status | Runtime Columns Read/Written (`db.ts` / `stats.ts`) | Verified Drift / Risk |
|---|---|---|---|
| `analytics_visitors` | Defined (`33-50`) | All DDL columns **plus** `ip_address` (`db.ts:111,124`, `stats.ts:441,652`) | `ip_address` missing in `init_analytics_db.js`; `total_sessions` never incremented on conflict (`db.ts:114-124`). |
| `analytics_sessions` | Defined (`53-68`) | All DDL columns (`db.ts:150-162`) | No index on `(visitor_id, started_at)` or `started_at` for range queries; only `idx_sessions_last_active` exists (`89`). |
| `analytics_events` | Defined (`71-83`) | All DDL columns **plus** `ip_address` (`db.ts:200,214`, `stats.ts:576,625`) | `ip_address` missing in `init_analytics_db.js`; no index on `session_id` or `(visitor_id, created_at)` for journey/flag lookups. |
| `analytics_restrictions` | **Missing** | `id`, `type` (`'ip' \| 'visitor_id'`), `value` (UNIQUE conflict target `db.ts:257`), `note`, `created_at` | Fresh DB setup from `init_analytics_db.js` throws `relation "analytics_restrictions" does not exist`. |
| `analytics_flags` | **Missing** | `id`, `target_type` (`'visitor_id' \| 'ip'`), `target_value`, `flag_type`, `note`, `created_at` (`ON CONFLICT (target_value, flag_type)` `db.ts:307`) | Fresh DB setup from `init_analytics_db.js` throws `relation "analytics_flags" does not exist`. |

### 2.3 Metric-by-Metric & Chart-by-Chart Audit of `admin/analytics`

**Time Filtering (`stats.ts:7-21`):** Supports `today`, `yesterday`, `7d` (today + 6 prior days), `30d` (today + 29 prior days), and `all`, truncated to `Asia/Kolkata` (`IST`) day boundaries. `baseAdminExclude` (`stats.ts:24`) filters `/admin%` paths, `%/admin%` targets, and `headless`/`bot` browsers in `getDashboardStats` and `getRecentEvents`, but is omitted in `getProductEnquiryPerformance`.

| Tab / Location (`page.tsx`) | Widget / Metric | Exact Formula / SQL (`stats.ts` / `page.tsx`) | Data Source & Limits | Audit Finding |
|---|---|---|---|---|
| **Header** (`1791-1794`) | `Online Now` | `COUNT(DISTINCT visitor_id)` where `last_active_at >= NOW() - INTERVAL '5 minutes'` (`stats.ts:30-37`) | `analytics_sessions` | Does not exclude `/admin%` entry pages or restricted/bot sessions. |
| **Global KPIs** (`1963-2068`) | `Unique Visitors`, `Total Views`, `WhatsApp Clicks`, `Phone Calls`, `Form Leads`, `Avg Dwell Time` | `COUNT(DISTINCT e.visitor_id)`, `COUNT(pageview)`, `COUNT(DISTINCT e.session_id)`, WA/Tel/Form predicates (`stats.ts:54-61`), `ROUND(AVG(s.duration_seconds))` (`58`) | `analytics_events e LEFT JOIN analytics_sessions s LEFT JOIN analytics_visitors v` | **Defect (`BUG-02`):** `avgDurationSeconds` is weighted by number of events per session. `totalClicks`, `rageClicks`, `deadClicks` (`57,62-63`) are returned by API but unrendered; `deadClicks` is always `0`. |
| **Tab 1 (`stream`)** (`2138-2799`) | GSC Spline/Bar Chart + 4 Scorecards | SQL `TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata', 'HH24:00' \| 'YYYY-MM-DD')` (`stats.ts:110-132`). Client zero-fills hours/days (`1407-1493`) and sums buckets into `chartTotals` (`1496-1514`). | `analytics_events` | **Defect (`BUG-08`):** `chartTotals.totalVisitors` (`2306`) sums per-bucket `visitors`, double-counting returning hourly/daily users. `timeSeries.leads` (`125`) omits `element_target ILIKE '%whatsapp%'`. |
| **Tab 1 (`stream`)** (`2802-2837`) | `Most Clicked Buttons & CTAs` | `COUNT(*)` of `click` grouped by `(element_text, element_target, element_tag, page_path)` (`stats.ts:86-107`) | `analytics_events`, `LIMIT 15` | Works as designed, though truncated query strings in `page_path` fragment product detail clicks. |
| **Tab 1 (`stream`)** (`2840-3151`) | `Live Activity Feed` | `getRecentEvents({ limit: 100, range })` (`stats.ts:538-642`) + `is_return_day` + `is_restricted` + client `eventSearch` (`1356-1379`) | `analytics_events`, `LIMIT 100` | **Defect (`BUG-14`):** Includes `heartbeat` events (`30s` intervals), exhausting the 100-row stream window during active browsing. |
| **Tab 2 (`products`)** (`3156-4271`) | 5 KPI cards + Catalog Table/Cards + Inspector Drawer | `getProductEnquiryPerformance(timeRange)` (`stats.ts:733-888`): reads 144 `.md` files via `getProducts()`, matches `viewsMap` (`/products/%/%`) and `clickRows` (slug/path/title/part#). `conversion_rate = views > 0 ? round(clicks/views*100) : clicks > 0 ? 100 : 0` (`850`). | `content/products/*.md` + `analytics_events` | **Defects (`BUG-04,05,11`):** Fails to strip `?query` from `page_path`; omits `baseAdminExclude`; `conversion_rate` exceeds 100% from listing/model enquiries; Inspector `getWhatsAppTestUrl` (`1238`) uses wrong phone `919443228800`; `inspectedProductEvents` (`1242`) only filters the 100-event client cache. |
| **Tab 3 (`audience`)** (`4275-5275`) | Top Market, Hub City, Primary Channel, Mobile Share, Geo Tables, Channels, Referrers, UTM, Tech | `topCountries` (`25`), `topRegions` (`25`), `topCities` (`35`), `devices`, `browsers` (`6`), `operatingSystems` (`6`), `topReferrers` (`20`), `utmCampaigns` (`10`) (`stats.ts:135-273`). Client classifies channels (`925-940`) & industrial clusters (`943-980`). | `analytics_visitors`, `analytics_events`, `analytics_sessions` | `inquiries_count` (`146,169,194`) only counts `wa.me`/`tel:` targets (excludes `form_submit` & `whatsapp` text). `getIndustrialClusterTag` (`943-980`) conflicts with `getIndustrialBadge` (`1530-1546`). |
| **Tab 4 (`demand`)** (`5279-6421`) | Search Demand, Copied Items, Dwell Distribution, Page/Section Dwell, Sentinel Surveillance | `searchQueries` (`LIMIT 30`, `276-289`), `searchSummary` (`291-303`), `topCopiedItems` (`15`, `306-319`), `sectionAttention` (`16`, `322-341`), `dwellBuckets` (`360-384`), `pageDwellStats` (`20`, `387-408`), `suspiciousDwellSessions` (`25`, `411-512`). | `analytics_events`, `analytics_sessions`, `analytics_flags` | **Defects (`BUG-03,06,09`):** `searchSummary` sums only top 30 queries; `pageDwellStats` averages `0`s from `pageview` rows; `stats.ts:476` falsy `0` fallback treats general copies as `partCopies`; `topPages` (`344-357`) is queried but never rendered. |
| **Tab 5 (`visitors`)** (`6424-7217`) | 4 Scorecards + Buyer Directory + Journey Modal | `getVisitorsList(250, 0, timeRange)` (`stats.ts:644-718`) + `visitorJourneyByDay` (`page.tsx:732-900`) | `analytics_visitors`, `analytics_events`, `LIMIT 250` | **Defect (`BUG-01`):** `v.total_sessions` is always `1`, breaking `Repeat Fleets (3+)` (`1568,6478`). Hard-capped at 250 visitors; correlated subqueries run per row. |
| **Tab 6 (`restrictions`)** (`7220-7464`) | Restriction Form + Active List + Mobile Sheet (`8078-8182`) | `getRestrictions()` (`db.ts:236-245`), `addRestriction`/`removeRestriction` (`route.ts:197-214`) | `analytics_restrictions` | Admin mutations lack audit logs (`SEC-06`), and DB rules are ignored by client/ingest guards (`SEC-03`). |

### 2.4 User-Facing Product Flows Audit

1. **Homepage & Entry Gate (`app/page.tsx`, `components/HomeClient.tsx`, `components/LoadingScreen.tsx`, `components/Hero.tsx`, `components/VideoCarousel.tsx`):**
   - On first visit in a session (`!sessionStorage.hasLoaded`), `LoadingScreen` blocks interaction for a **minimum of 3,000 ms** (`HomeClient.tsx:100-103`) and up to **12,000 ms** (`106-111`) waiting for `VideoCarousel`'s first video `onCanPlayThrough` (`VideoCarousel.tsx:143,177`) plus Lottie cycle completion (`LoadingScreen.tsx:26-44`). **Zero** telemetry measures splash duration, fallback timeouts, or pre-dismiss bounce, and `VideoCarousel` tracks zero slide switches, arrows, video completions, or playback errors.
2. **Navigation, Search & Catalog (`app/products/page.tsx`, `components/ClientHeaderWrapper.tsx`, `components/Header.tsx`, `components/GlobalSearchModal.tsx`, `components/ProductCategories.tsx`, `components/ProductsPage.tsx`, `app/sitemap.ts`):**
   - `app/products/page.tsx:28-59` renders `ClientHeaderWrapper` (`1-39`), `ProductsPage`, and `Footer`; `app/sitemap.ts:6-77` exposes `/`, `/products`, 3 category URLs, `144` products, `/models`, and `10` machine slugs for search indexing.
   - `Header` and `GlobalSearchModal` richly track search modal open/close, category filters, clear query, machine hub clicks, result rank selection, and zero-result/excavator WhatsApp CTAs (`GlobalSearchModal.tsx:119-680`). However, keyboard `ArrowUp/ArrowDown/Enter` vs mouse click selection is indistinguishable, and `Header.tsx:30` / `ProductCategories.tsx:14` / `GlobalSearchModal.tsx:83` only check static 1-UUID `isRestrictedVisitor()`, bypassing DB restrictions.
   - `ProductsPage.tsx:51` holds unused `filterAvailability` state (`'all'`). `ProductsPage.tsx:155` `lastTrackedQueryRef` skips re-tracking if a user clears and re-enters the same query. The Excavator category banner WhatsApp link (`298-308`) lacks `data-track`, and imageless cards (`349-369`) render an inline "Coming Soon" box rather than `ProductPlaceholderImage`.
3. **Product Detail, Specs, Zoom, Export & Recommendations (`app/products/[category]/[slug]/page.tsx`, `components/ProductImageZoom.tsx`, `components/ProductPlaceholderImage.tsx`, `components/ExportInfo.tsx`, `hooks/useGeoLocation.ts`, `lib/recommendations.ts`):**
   - `ProductPage` generates static params (`144` products) and `permanentRedirect`s non-canonical slugs (`132-134`).
   - **Untracked sub-flows:** `ProductImageZoom` (`62-102`) lightbox opens/closes; `"Product Details"` `<details>` spec accordion (`260-361`); `"Similar Products"` (`getRelatedProducts`, `415-439`) card clicks have no `data-track="related_product_click"` or source product metadata; `ProductPlaceholderImage`'s `"Request Real Photos on WhatsApp"` (`ProductPlaceholderImage.tsx:138-148`) is not even mounted on `ProductImageZoom` (`33-58`) or `ProductsPage` (`349-369`); `ExportInfo` (`ExportInfo.tsx:16-68`) never tracks banner impressions, and `useGeoLocation.ts:28-48` makes a redundant client call to `https://ipapi.co/json/` with zero latency/error telemetry.
4. **Machine Hubs (`app/models/page.tsx`, `app/models/[slug]/page.tsx`, `components/ModelProductGrid.tsx`):**
   - Covers `10` machine models (`8` primary + `other-wheel-loaders` + `excavators`) with `301` redirects (`next.config.js:19-52`, `models/[slug]/page.tsx:88-96`).
   - `ModelProductGrid.tsx:92` tracks `search` (1200ms debounce) without `category`, and its empty-state banner WhatsApp CTA (`167-177`) has no `data-track` (unlike `model_unlisted_part_whatsapp` at `219` and `model_zero_results_whatsapp` at `426`). In Server Component `app/models/[slug]/page.tsx`, sibling hub cards (`376-396`) carry `data-track="model_sibling_switcher_card"`, and the FAQ `<details>` list (`413-436`) carries `data-track="model_faq_accordion_toggle"`, which captures only raw clicks without open/close `toggle` state unless wrapped in a client component.
5. **Lead Capture Forms & Intercepts (`components/Contact.tsx`, `components/TargetedAssistanceModal.tsx`, `components/WhatsAppButton.tsx`, `components/Footer.tsx`):**
   - `Contact.tsx:97-138` submits directly from browser to `https://api.staticforms.xyz/submit` using hardcoded `accessKey: 'sf_fd80e723henagadlica8agki'`. Only on `response.ok && data.id` does it fire `tracker.identify` and `tracker.trackForm('submit', 'Contact Form', { company })` — **never storing `message` in PostgreSQL**, never calling `trackForm('start' | 'abandon')`, and never tracking validation errors (`errors` `19`) or StaticForms failures (`131-137`). Contact cards (`Visit Our Shop`, `Call Us Directly`, `Email Us`, and the error-fallback WhatsApp link `331-338`) lack `data-track` labels. `onProductEnquire` (`10`) is unused and `AIPartsAssistant` (`442-444`) is commented out.
   - `TargetedAssistanceModal.tsx` checks both `isRestrictedVisitor()` and `GET /api/restrictions` (`53-72`), auto-opens after 700ms, and submits to StaticForms — **without checking `res.ok`** (`137-169`), marking `submitSuccess = true` and recording `form_submit` even on API failure. Its direct `WhatsApp Us` (`369`) and `Call Now` (`380`) CTAs lack `data-track` identifiers.
6. **Review Redirect & 404 (`app/add-review/route.ts`, `app/not-found.tsx`):**
   - `/add-review` serves an immediate HTML meta-refresh + JS redirect to Google Reviews (`https://g.page/r/CZE_4NfHV7FQEBM/review`) with zero hit, referrer, or UTM tracking.
   - `app/not-found.tsx` renders 3 category cards + WhatsApp CTA with zero `not_found` event, missing URL, referrer, or `data-track` attributes.

### 2.5 Admin & External Integration Flows Audit

- **`/admin` (Decap CMS):** `public/admin/index.html` loads Netlify Identity widget + `decap-cms@^3.0.0`, configured in `public/admin/config.yml` (`backend: github`, `repo: bhuvi28/mm-earthmovers`, `publish_mode: editorial_workflow`, `auth_endpoint: api/auth`). GitHub OAuth handshake runs via `app/api/auth/route.ts` and `app/api/callback/route.ts` (`40-50` posts token back to `message.origin` after `postMessage(..., '*')`).
- **`/admin/analytics`:** Client-only React dashboard authenticated by `ADMIN_ANALYTICS_KEY` cookie (`mm_analytics_auth`). No RBAC, no audit log, no CRM lead workflow, no operational health view.
- **Google Analytics 4 & Vercel Analytics:** Both mount globally in `app/layout.tsx:159-179` (including on `/admin/analytics`!), with **zero** custom `gtag('event', ...)` or Vercel `track()` conversion events anywhere in the codebase.
- **External Services (`StaticForms`, `ip-api.com`, `ipapi.co`, `ntfy.sh`, `Resend`, `Webhook`, `IndexNow`):** All external calls are unmonitored (`console.error` or silent `catch {}`), and `app/api/indexnow/route.ts:6` embeds its secret key directly in source.

### 2.6 Verified Bugs, Security Defects, Performance Bottlenecks & Blind Spots

All findings below were directly verified in source files:

1. **`BUG-01` — Frozen `total_sessions = 1` (`lib/analytics/db.ts:108-125`):** `ON CONFLICT (visitor_id) DO UPDATE` never increments `total_sessions`. Breaks `Repeat Fleets (3+)` (`app/admin/analytics/page.tsx:1568,6478,6972`) and `total_sessions >= 2` filter (`1600,6782`).
2. **`BUG-02` — Event-Weighted `avgDurationSeconds` (`lib/analytics/stats.ts:58,64-67`):** `AVG(s.duration_seconds)` runs over `analytics_events e LEFT JOIN analytics_sessions s`, skewing average dwell toward high-event/heartbeat sessions.
3. **`BUG-03` — Zero-Diluted `pageDwellStats` (`lib/analytics/stats.ts:400,403`):** `AVG(COALESCE((e.metadata->>'dwellSeconds')::numeric, 0))` runs over `event_type IN ('pageview', 'section_view')`; every `pageview` injects `0`.
4. **`BUG-04` — Query-String View Misses (`lib/analytics/stats.ts:785,793` vs `components/AnalyticsProvider.tsx:36`):** `AnalyticsProvider` logs `pathname?searchParams` (e.g. `?utm_source=...`), while `getProductEnquiryPerformance` looks up exact `/products/${catSlug}/${canonicalSlug}` in `viewsMap`.
5. **`BUG-05` — Unbounded `conversion_rate` & Missing Bot Filter (`lib/analytics/stats.ts:754-780,850`):** Direct listing/model enquiries inflate `conversion_rate` to `100%` or `>100%` when detail views are `0`; `getProductEnquiryPerformance` also omits `baseAdminExclude`.
6. **`BUG-06` — Falsy `0` Part-Copy Bug (`lib/analytics/stats.ts:476`):** `const partCopies = Number(s.part_copies_count) || copies;` treats `0` part copies as falsy and substitutes total `copies`, misclassifying general text copies as `competitor_recon`.
7. **`BUG-07` — Copy Predicate Mismatch (`lib/analytics/flags.ts:287` vs `58-125`):** Batch check uses `isPartNumberCopy`, whereas cumulative session SQL counts all `event_type = 'copy'` rows.
8. **`BUG-08` — Double-Counted Chart Visitors & Predicate Drift (`app/admin/analytics/page.tsx:1499,1506,2306`; `stats.ts:125,146,169,194`):** `chartTotals.totalVisitors` sums hourly/daily distinct counts; `timeSeries.leads` omits `element_target ILIKE '%whatsapp%'`; geo `inquiries_count` omits `form_submit` and `element_text ILIKE '%whatsapp%'`.
9. **`BUG-09` — Truncated `searchSummary` (`lib/analytics/stats.ts:287-303`):** `totalSearches`, `zeroResultsSearches`, and `catalogGapRate` sum only the top 30 queries.
10. **`BUG-10` — Silent Lead Loss on StaticForms Failure (`components/TargetedAssistanceModal.tsx:137-169`):** `res.ok` is never checked; `submitSuccess` and `form_submit` fire even if StaticForms fails.
11. **`BUG-11` — Wrong Admin Test WhatsApp & Stale Inspector Events (`app/admin/analytics/page.tsx:1238,1242-1260`):** `getWhatsAppTestUrl` uses `919443228800` instead of `+918334887009`; `inspectedProductEvents` only searches the 100-event client cache.
12. **`BUG-12` — DB Schema Drift (`scripts/init_analytics_db.js:33-91`):** Missing `ip_address` columns and `analytics_restrictions`/`analytics_flags` tables.
13. **`BUG-13` — Decoder/Search/Cluster Bugs (`lib/analytics/encoder.ts:91-94`, `ProductsPage.tsx:155`, `page.tsx:943-980,1530-1546`):** Unencoded `{ v, t }` payloads skip `expandEvent()` and drop silently (`analytics/route.ts:50`); `ProductsPage` `lastTrackedQueryRef` blocks re-tracking cleared searches; `getIndustrialClusterTag` and `getIndustrialBadge` assign conflicting cluster labels (e.g., Jamshedpur).
14. **`BUG-14` — Heartbeat Saturation & RFC1918 Gap (`tracker.ts:439`, `stats.ts:547,601-639`, `geo.ts:43-44`):** 30s heartbeats crowd `LIMIT 100`/`200` stream/journey results and trigger `evaluateAndRecordFlag` (`analytics/route.ts:94`); `geo.ts` private IP check skips `172.17.`–`172.30.`.
15. **`BUG-15` — Orphaned Features & Catalog Gaps:** `deadClicks`, `form_start`/`form_abandon`, `topPages`, `onProductEnquire`, `filterAvailability`, `AIPartsAssistant`, `ComingSoon`, `public/products.json`, `/api/collect`; `16` products lack `image`, `0` Excavator SKUs, `0` files define `availability`/`condition`/`price`/`oemRef`.
16. **`SEC-01` – `SEC-06` — Security & Access-Control Defects:** Unauthenticated `GET /api/flags` and `GET /api/restrictions`; raw `databaseError` exposed in `GET /api/analytics?check=status` (`295`) and raw `details: error?.message` in `POST /api/analytics` catch block (`263`); fallback `'mmearth@2026'` key & plaintext auth cookie; hardcoded StaticForms/IndexNow/Supabase/Bhuvan strings; split static-only vs DB restriction checks (plus Edge Runtime `middleware.ts` inability to import `pg`); `/api/collect` missing bot-UA filter; `/api/callback` wildcard `postMessage`; zero admin audit logs or login rate limiting.
17. **Performance Bottlenecks:** `page.tsx:602-608` fires 5 API calls every 15s (even in background tabs); `getDashboardStats` executes 14 sequential SQL queries on a `max: 4` pool (`db.ts:31`); `getProductEnquiryPerformance` (`stats.ts:735`) synchronously reads/parses 144 `.md` files every poll; `getVisitorsList` (`stats.ts:648-715`) runs correlated subqueries per row.

---

## 3. Part 2 — Analytics & Observability Ideation Plan (R2)

### 3.1 Product & Business Insights (`BI-01` – `BI-10`)

| ID | Proposed Insight & Metrics | Source Flows & Features | Concrete Business Decision / Product Action (`PROD-*`) Supported |
|---|---|---|---|
| **`BI-01`** | **End-to-End Enquiry Attribution & 1-Year Usage Lenses (No CRM):** Immutable form-submission backup count (`contact_form`, `targeted_modal` in `analytics_leads` without CRM statuses/quotes) + outbound intent volume (`wa.me`, `tel:` clicks in `analytics_events`), attributed by page, search query, city, and UTM/referrer, plus `90d` and `1y` (`YYYY-MM` monthly series) views. | `Contact.tsx`, `TargetedAssistanceModal.tsx`, outbound WhatsApp/Tel CTAs, `/admin/analytics` | Reveals true enquiry volume and buyer demand trends over 12 months without CRM maintenance overhead (`PROD-01`). |
| **`BI-02`** | **Placement-Level Enquiry Attribution:** Clicks & lead rate segmented by canonical `placement` (`floating_whatsapp`, `product_detail_enquire`, `product_grid_enquire`, `model_hero_wa`, `model_empty_wa`, `model_unlisted_wa`, `model_zero_results_wa`, `export_banner_wa`, `contact_maps`, `contact_call`, `contact_email`, `contact_whatsapp`, `contact_error_wa`, `modal_whatsapp`, `modal_call`, `excavator_banner_wa`, `placeholder_photo_wa`, `not_found_wa`). | All CTAs across storefront & `ProductPlaceholderImage` | Identifies which UI placements convert buyers vs create noise; guides CTA copy & placement optimization (`PROD-02`). |
| **`BI-03`** | **Search-to-Gap-to-Lead Recovery Funnel:** Uncapped search volume, zero-result queries, zero-result -> WhatsApp recovery rate (`search_zero_result_whatsapp`, `products_zero_results_whatsapp`, `model_zero_results_whatsapp`, `search_excavator_whatsapp`), search result rank CTR (`resultRank` 1..N), and keyboard vs mouse selection ratio. | `GlobalSearchModal.tsx`, `ProductsPage.tsx`, `ModelProductGrid.tsx` | Ranks uncataloged part numbers by recovery demand to prioritize SKU creation in Decap CMS (`PROD-03`). |
| **`BI-04`** | **Catalog Health, Missing-Photo (`16` SKUs) & Excavator (`0` SKUs) Demand:** `placeholder_impression` views & `"Request Real Photos on WhatsApp"` (`placeholder_photo_wa`) clicks on imageless products (`hasImage: false`); Excavator category pageviews, searches, and `excavator_banner_wa` clicks. | `ProductImageZoom.tsx`, `ProductPlaceholderImage.tsx`, `ProductsPage.tsx`, `models/excavators` | Quantifies revenue lost on `16` imageless SKUs and `0`-SKU Excavator category to prioritize warehouse photography and onboarding (`PROD-02`, `PROD-03`). |
| **`BI-05`** | **Product Detail Engagement & Recommendation Attribution:** Lightbox zoom rate (`image_zoom`), `"Product Details"` spec accordion expand rate (`spec_toggle`), brand badge/spec link clicks (`model_hub_nav`), and `getRelatedProducts` CTR + downstream enquiry rate (`related_product_click`). | `ProductImageZoom.tsx`, `app/products/[category]/[slug]/page.tsx`, `lib/recommendations.ts` | Validates whether `getRelatedProducts` subsystem affinity increases multi-part basket inquiries. |
| **`BI-06`** | **Form Funnel & Validation Friction:** `form_start` (first field focus), `form_validation_error` (by field name), `form_abandon` (started without submit before unload/close), `form_submit_error` (StaticForms/network failure), and `form_submit` completion rate. | `Contact.tsx`, `TargetedAssistanceModal.tsx` | Pinpoints fields causing buyer drop-off (e.g., 10-char message rule or phone regex) and catches form outages (`PROD-01`). |
| **`BI-07`** | **Export & International Buyer Funnel:** `export_banner_view` count by country, `export_banner_wa` (`export_whatsapp_quote`) CTR (`ExportInfo.tsx`), and country-level enquiry rate comparing server Geo (`cf-ipcountry`/`ip-api`) vs client `ipapi.co`. | `ExportInfo.tsx`, `hooks/useGeoLocation.ts`, `lib/analytics/geo.ts` | Quantifies export demand (Nepal, Bangladesh, Bhutan, UAE, Africa) to justify dedicated export landing content or shipping calculators. |
| **`BI-08`** | **Machine Model Hub & FAQ Performance:** Entry-to-part-detail rate per `MachineModel` (`10` hubs), `model_faq_accordion_toggle` open/close counts by question (via client `<ModelFaqAccordion>` wrapper), and `model_sibling_switcher_card` navigation paths. | `app/models/page.tsx`, `app/models/[slug]/page.tsx`, `ModelFaqAccordion.tsx`, `ModelProductGrid.tsx` | Guides SEO content expansion and verifies model compatibility regexes (`lib/machines.ts`). |
| **`BI-09`** | **True Repeat Fleet & Cohort Conversion Lift:** Fixed `total_sessions` distribution (`1`, `2`, `3+`), return-day conversion lift (Day 1 vs Day 2+ RFQ rate), and first-touch UTM/referrer attribution across multi-day IP-stitched journeys. | `lib/analytics/db.ts`, `lib/analytics/stats.ts`, `Visitors` tab | Separates one-time browsers from repeat fleet procurement officers (`PROD-09`). |
| **`BI-10`** | **GA4 Conversion Parity & Google Review Funnel:** Dual-dispatched GA4 events (`generate_lead`, `view_item`, `search`, `select_item`) with `/admin/*` excluded via `<TelemetryScripts />` client wrapper, plus `/add-review` hit counts by `utm_source` / `?src=` tag. | `components/TelemetryScripts.tsx`, `app/layout.tsx`, `app/add-review/route.ts`, `lib/analytics/ga4.ts` | Enables Google Ads bidding optimization and measures post-delivery customer review link effectiveness (`PROD-10`). |

### 3.2 Operational Observability (`OBS-01` – `OBS-09`)

| ID | Proposed Operational Telemetry | Capture Layer | Operational Decision / Alerting Action Supported |
|---|---|---|---|
| **`OBS-01`** | **Ingestion Pipeline Health & Client Retry Queue:** Validated vs rejected vs DB-failed batch counts (`analytics_ops_metrics`, `metric_kind = 'ingest_batch'`), origin-rejected hits, decode failures, and byte-chunked client retry queue (`localStorage['mm_retry_queue']`). | `lib/analytics/ingestHandler.ts`, `tracker.ts`, `analytics_ops_metrics` | Eliminates silent `204` telemetry black holes; alerts when ingestion error rate `> 1%`. |
| **`OBS-02`** | **API Route Latency & Error Budget:** Route-level duration (`p50`, `p95`, `max`) and `2xx`/`4xx`/`5xx` counts across `/api/analytics`, `/api/leads`, `/api/products/search`, `/api/flags`, `/api/restrictions`, `/api/indexnow` (`metric_kind = 'api_request'`). | `lib/analytics/ops.ts` + API route wrappers -> `analytics_ops_metrics` | Identifies slow dashboard views or failing endpoints before users notice. |
| **`OBS-03`** | **DB Pool & Query Performance Telemetry:** Consolidated CTE latency (`metric_kind = 'db_query'`), active/waiting pool counts (`pool.totalCount`, `pool.idleCount`, `pool.waitingCount` on `max: 4`), and `getProducts()` cache hit/miss ratio (`metric_kind = 'catalog_cache'`). | `lib/analytics/db.ts`, `lib/analytics/stats.ts`, `lib/products.ts`, `analytics_ops_metrics` | Validates consolidated CTE queries & catalog caching; prevents serverless pool exhaustion (`PROD-08`). |
| **`OBS-04`** | **External Integration SLA Tracking:** Outcome (`ok`/`timeout`/`error`), HTTP status, and latency for server calls (`StaticForms`, `ip-api.com`, `Resend`, `ntfy.sh`, `Webhook`, `IndexNow`, `GitHub OAuth`) and client `ipapi.co` (`client_ops` event routed to `analytics_ops_metrics`). | `lib/analytics/ops.ts`, `geo.ts`, `alert.ts`, `api/leads`, `hooks/useGeoLocation.ts` | Surfaces third-party degradation (e.g., `ip-api.com` 45 req/min limit or StaticForms downtime) immediately (`PROD-01`). |
| **`OBS-05`** | **Persistent Alert Deduplication & Delivery Audit:** DB-backed `analytics_alert_deliveries` tracking every Sentinel trigger, deduped suppression, channel (`phone_push`/`email`/`webhook`), HTTP status, and error message. | `lib/analytics/alert.ts`, `analytics_alert_deliveries` | Stops duplicate phone/email alerts across serverless cold starts and verifies alert delivery. |
| **`OBS-06`** | **Client Runtime Errors & `404` Broken-Link Telemetry:** `window.onerror`, `unhandledrejection`, React `app/error.tsx` crashes (`client_error`), and `app/not-found.tsx` hits (`not_found` capturing missing URL, referrer, inferred part number) stored in `analytics_events`. | `components/AnalyticsProvider.tsx`, `app/error.tsx`, `app/not-found.tsx`, `analytics_events` | Detects mobile Safari/Android JS regressions and broken backlinks/slugs needing `next.config.js` redirects. |
| **`OBS-07`** | **Splash Gate Latency & Pre-Dismiss Bounce Rate:** Time from mount to `onFirstVideoReady` (`ms`), 12s fallback timeout rate, and sessions that close/hide tab while `LoadingScreen` is still visible (`loading_screen_timing` in `analytics_events`). | `components/HomeClient.tsx`, `components/LoadingScreen.tsx`, `analytics_events` | Provides hard data to tune or remove the 3–12s video loading gate (`PROD-04`). |
| **`OBS-08`** | **Edge Restriction Cache Hit/Block Metrics:** Daily counts of `/products*`, `/models*`, and `/api/products*` requests blocked by Edge `middleware.ts` (split by `visitor_id` vs `ip`) and `/api/internal/restrictions` cache refresh latency/errors emitted via `event.waitUntil(fetch(...))` to `POST /api/internal/ops-block` -> `analytics_ops_metrics` (`metric_kind = 'middleware_block'`). | `middleware.ts`, `app/api/internal/ops-block/route.ts`, `analytics_ops_metrics` | Confirms restricted scrapers are actively stopped without importing `pg` into Edge Runtime (`PROD-05`). |
| **`OBS-09`** | **Admin Security & Audit Trail:** Immutable log (`analytics_audit_logs`) of admin login successes/failures, logouts, restriction adds/removes, flag adds/removes, and CSV exports. | `analytics_audit_logs`, `app/api/analytics/route.ts`, `flags/route.ts`, `restrictions/route.ts` | Detects brute-force passcode attempts and provides full change history (`SEC-06`). |

---

## 4. Part 3 — Concrete Product Improvements Plan (R3)

1. **`PROD-01` — Resilient First-Party Form Proxy & Backup Log (No CRM; Supports `BI-01`, `BI-06`, `OBS-04`):**
   Replace direct browser `fetch('https://api.staticforms.xyz/submit')` in `Contact.tsx` and `TargetedAssistanceModal.tsx` with `POST /api/leads`. The server validates input, upserts `analytics_visitors` first (when `visitorId` is present) so FK `23503` never occurs, writes an immutable backup & attribution record into `analytics_leads` *first*, then maps `contact` -> `'contact-info'` with `replyTo: '@'` when forwarding server-side to StaticForms (using `process.env.STATICFORMS_ACCESS_KEY`) with `Resend`/`ntfy.sh` fallback if StaticForms fails. **Impact:** Eliminates silent lead loss and removes the exposed StaticForms key from client JS while keeping the workflow strictly notification + analytics based (zero CRM pipeline).
2. **`PROD-02` — Consistent Missing-Photo Merchandising & Tracked Photo Requests (Supports `BI-02`, `BI-04`):**
   Replace the inline "Coming Soon" blocks in `ProductsPage.tsx:349-369`, `ModelProductGrid.tsx:317-337`, `ProductImageZoom.tsx:33-58`, and `app/products/[category]/[slug]/page.tsx:426-430` with `ProductPlaceholderImage` (`variant="card" | "hero" | "thumbnail"`), adding `data-track="placeholder_request_photo_whatsapp"` and `data-placement="placeholder_photo_wa"` on its WhatsApp CTA (`ProductPlaceholderImage.tsx:138`) plus `placeholder_impression` tracking on render. **Impact:** Turns the `16` imageless SKUs into active WhatsApp photo leads and ranks photography backlog by demand.
3. **`PROD-03` — Demand-Driven Catalog Expansion Workflow (Supports `BI-03`, `BI-04`):**
   Add one-click `"Create in CMS"` deep links (`/admin/#/collections/products/new`) from Tab 4 Zero-Result Searches and Tab 2 Cold/Imageless Inventory rows, plus an Excavator demand summary card. **Impact:** Closes the loop between search demand analytics and Decap CMS merchandising.
4. **`PROD-04` — Non-Blocking Homepage Hero & `<=1.5s` `LoadingScreen` Cap (Supports `OBS-07`):**
   Once `OBS-07` confirms splash drop-off, lower `minTimeTimer` (`HomeClient.tsx:103`) from `3000ms` to `800ms` (or make `LoadingScreen` skippable / non-blocking with video `poster` fallback) and cap fallback at `2500ms` instead of `12000ms`. **Impact:** Protects mobile Core Web Vitals (LCP/FCP) and reduces first-visit bounce.
5. **`PROD-05` — Edge/Server Split Restriction Architecture & Privacy-Safe Visitor Status Endpoint (Supports `SEC-03`, `OBS-08`):**
   Split Edge-safe `lib/restrictions-static.ts` (`RESTRICTED_VISITOR_IDS`, `isStaticRestrictedVisitor`) from Node/PG `lib/restrictions-server.ts` (`isVisitorOrIpRestricted` querying `analytics_restrictions` with 15s cache and lowercase normalization). Keep `middleware.ts` Edge-compatible by fetching `GET /api/internal/restrictions` authenticated with `x-internal-secret` (never calling unauthenticated or public `/api/restrictions` and never importing `pg` in Edge). Add public privacy-safe `GET /api/visitor-status` returning `{ restricted: boolean }` for `Header.tsx`, `ProductCategories.tsx`, `GlobalSearchModal.tsx`, `TargetedAssistanceModal.tsx`, and `AnalyticsProvider.tsx`. **Impact:** Admin-added IP/visitor blocks immediately enforce across Edge middleware, UI, search, SSR redirects, and telemetry ingestion without leaking PII or breaking `next build`.
6. **`PROD-06` — Auth, Secret & OAuth Security Hardening (Supports `SEC-01`, `SEC-02`, `SEC-04`, `SEC-05`, `OBS-09`):**
   Gate `GET /api/flags` and `GET /api/restrictions` behind `isAuthorized(req)`; fail closed when `ADMIN_ANALYTICS_KEY` is missing in production; consolidate `action: 'login'` into `lib/analytics/auth.ts` issuing HMAC-SHA256 signed `HttpOnly` session cookies (Unix-second `exp` + equal-length `crypto.timingSafeEqual`); sanitize raw error details in both `GET /api/analytics?check=status` (`295`) and `POST /api/analytics` catch block (`263`); move `INDEXNOW_KEY` and `STATICFORMS_ACCESS_KEY` to `process.env`; replace hardcoded Bhuvan exemption with `EXEMPT_TEST_CONTACTS` / `EXEMPT_TEST_NAMES` env vars; validate `message.origin` (allowing `window.location.origin`, Vercel previews, and `127.0.0.1:3000`) in `app/api/callback/route.ts`; add IP rate limiting on admin login.
7. **`PROD-07` — Dead Code & Catalog Schema Hygiene (Supports `BUG-13`, `BUG-15`):**
   Remove or retire unused `public/products.json`, `components/AIPartsAssistant.tsx`, `components/ComingSoon.tsx`, unused `onProductEnquire` prop (`Contact.tsx:10`), unused `filterAvailability` (`ProductsPage.tsx:51`), and unused `Product` fields (`oemRef`, `price`, `availability`, `condition` in `lib/products.ts:16-19`). Consolidate `/api/collect` to share `ingestTelemetryRequest` with `/api/analytics` (including bot-UA filtering). Unify `getIndustrialClusterTag` and `getIndustrialBadge` into `lib/analytics/clusters.ts`.
8. **`PROD-08` — `admin/analytics` Modularization, Scoped Polling & CTE Consolidation (Supports `OBS-03`):**
   Split `app/admin/analytics/page.tsx` (`8,185` lines) into focused tab/modal components under `app/admin/analytics/_components/`. Poll only the active tab when `document.visibilityState === 'visible'` (keeping a lightweight 15s refresh only on `stream` or `Online Now`), consolidate `getDashboardStats`'s 14 queries into **3–4 CTE queries** so the `max: 4` pool (`lib/analytics/db.ts:31`) is never saturated, cache parsed `getProducts()` in memory with directory `mtimeMs` invalidation (`catalog_cache` telemetry), and add server-side pagination/search for `Visitors` (`>250` rows) and `Product Inspector` events.
9. **`PROD-09` — Lightweight `Ops & Audit` Tab in `/admin/analytics` (CRM Tab Removed; Supports `OBS-01`–`OBS-09`):**
   Add an `Ops & Audit` tab (P2) displaying ingestion drop rates, API p95 latency, DB pool & `catalog_cache` hit rate, external SLA status (including `ipapi.co`), alert delivery history, `404` URLs, `LoadingScreen` p50/p95/bounce, client JS errors, Edge block counts, and admin audit logs. *(The previously proposed `Leads & CRM` tab is removed as out of scope for a 1–5 person team.)*
10. **`PROD-10` — GA4 Dual-Dispatch Helper (`/admin/*` Excluded) & `/add-review` Telemetry (Supports `BI-10`):**
    Extract GA4 `<Script>` tags and Vercel `<Analytics />` from Server Component `app/layout.tsx:159-179` into a `'use client'` `<TelemetryScripts />` wrapper that returns `null` when `usePathname()?.startsWith('/admin')`. Add `lib/analytics/ga4.ts` to emit `gtag('event', ...)` alongside first-party `tracker` calls, and update `app/add-review/route.ts` (`force-dynamic`, `nodejs`, `GET(req)`) to read/set `mm_vid`, upsert `analytics_visitors`, and log `review_redirect` before redirecting to Google Reviews.

---

## 5. Part 4 — Implementation-Ready Technical Specification (R4)

### 4.1 Schema & Migrations Specification

Reconcile `scripts/init_analytics_db.js` to be **idempotent** (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) covering all 5 existing tables plus new operational/backup tables (with `analytics_lead_events` unused while CRM is out of scope).

```sql
-- ============================================================
-- 1. EXISTING TABLES RECONCILIATION (fixes BUG-12)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_visitors (
  visitor_id VARCHAR(64) PRIMARY KEY,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_sessions INT NOT NULL DEFAULT 1,
  country VARCHAR(64),
  country_code VARCHAR(8),
  region VARCHAR(64),
  city VARCHAR(64),
  device_type VARCHAR(32),
  browser VARCHAR(64),
  os VARCHAR(64),
  screen_resolution VARCHAR(32),
  language VARCHAR(32),
  timezone VARCHAR(64),
  identified_name VARCHAR(128),
  identified_contact VARCHAR(128),
  ip_address VARCHAR(64)
);
ALTER TABLE analytics_visitors ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_id VARCHAR(64) PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  entry_page TEXT,
  exit_page TEXT,
  duration_seconds INT NOT NULL DEFAULT 0,
  referrer TEXT,
  utm_source VARCHAR(128),
  utm_medium VARCHAR(128),
  utm_campaign VARCHAR(128),
  device_type VARCHAR(32),
  country VARCHAR(64),
  city VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL REFERENCES analytics_visitors(visitor_id) ON DELETE CASCADE,
  session_id VARCHAR(64),
  event_type VARCHAR(64) NOT NULL,
  page_path TEXT NOT NULL,
  page_title TEXT,
  element_text TEXT,
  element_target TEXT,
  element_tag VARCHAR(32),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(64)
);
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

CREATE TABLE IF NOT EXISTS analytics_restrictions (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(16) NOT NULL CHECK (type IN ('ip', 'visitor_id')),
  value VARCHAR(128) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Enforce case-insensitive uniqueness on analytics_restrictions.value:
-- 1) Drop legacy UNIQUE constraint first so normalization UPDATE never hits 23505
ALTER TABLE analytics_restrictions DROP CONSTRAINT IF EXISTS analytics_restrictions_value_key;
-- 2) Deduplicate existing case/whitespace-colliding rows keeping newest id
DELETE FROM analytics_restrictions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(value)) ORDER BY id DESC) AS rn
    FROM analytics_restrictions
  ) dup
  WHERE dup.rn > 1
);
-- 3) Normalize stored values to lowercase trimmed
UPDATE analytics_restrictions SET value = LOWER(TRIM(value)) WHERE value <> LOWER(TRIM(value));
-- 4) Create expression unique index matching db.ts ON CONFLICT ((LOWER(value)))
CREATE UNIQUE INDEX IF NOT EXISTS idx_restrictions_value_lower ON analytics_restrictions (LOWER(value));

CREATE TABLE IF NOT EXISTS analytics_flags (
  id BIGSERIAL PRIMARY KEY,
  target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('visitor_id', 'ip')),
  target_value VARCHAR(128) NOT NULL,
  flag_type VARCHAR(32) NOT NULL CHECK (flag_type IN ('competitor', 'scraper', 'nuisance', 'vip_buyer', 'suspicious')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (target_value, flag_type)
);

-- ============================================================
-- 1B. HISTORICAL BACKFILL FOR BUG-01 (IDEMPOTENT)
-- ============================================================
UPDATE analytics_visitors v
SET total_sessions = GREATEST(1, sub.cnt)
FROM (
  SELECT visitor_id, COUNT(DISTINCT session_id) AS cnt
  FROM analytics_sessions
  GROUP BY visitor_id
) sub
WHERE v.visitor_id = sub.visitor_id
  AND v.total_sessions <> GREATEST(1, sub.cnt);

-- ============================================================
-- 2. NEW TABLES (BI-01, OBS-01..09, SEC-06)
-- ============================================================

-- Immutable Form Submission Backup & Attribution Log (BI-01, PROD-01 — No CRM)
-- Note: Outbound WhatsApp/Phone clicks remain in analytics_events (BI-02 intent signals);
-- analytics_leads serves purely as an immutable backup log & attribution join table (no CRM status/quote UI).
-- (analytics_lead_events created during P0 bootstrap remains unused/deprecated while CRM is out of scope.)
CREATE TABLE IF NOT EXISTS analytics_leads (
  id BIGSERIAL PRIMARY KEY,
  lead_uuid UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  visitor_id VARCHAR(64) REFERENCES analytics_visitors(visitor_id) ON DELETE SET NULL,
  session_id VARCHAR(64),
  source VARCHAR(32) NOT NULL CHECK (source IN ('contact_form', 'targeted_modal')),
  placement VARCHAR(64),
  name VARCHAR(128),
  company VARCHAR(128),
  contact VARCHAR(128) NOT NULL,
  message TEXT,
  product_slug VARCHAR(128),
  part_number VARCHAR(128),
  machine_slug VARCHAR(64),
  search_query VARCHAR(256),
  delivery_status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'fallback_sent', 'failed')),
  external_provider VARCHAR(32),
  external_ref VARCHAR(128),
  ip_address VARCHAR(64),
  country VARCHAR(64),
  city VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Operational Metrics: Ingestion, API Latency, DB/Cache & External SLAs (OBS-01..04, OBS-08)
-- Note: Client-side UX/crash telemetry ('client_error', 'loading_screen_timing', 'not_found') is stored
-- in analytics_events; server/edge operational telemetry & client 'ipapi_co' SLA probes live here.
CREATE TABLE IF NOT EXISTS analytics_ops_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_kind VARCHAR(32) NOT NULL CHECK (metric_kind IN ('ingest_batch', 'api_request', 'db_query', 'external_call', 'middleware_block', 'catalog_cache')),
  target_name VARCHAR(96) NOT NULL,
  status_code INT,
  outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('ok', 'rejected', 'timeout', 'error', 'blocked', 'cache_hit', 'cache_miss')),
  duration_ms INT NOT NULL DEFAULT 0,
  batch_size INT DEFAULT 1,
  error_code VARCHAR(64),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Persistent Alert Deduplication & Delivery Log (OBS-05)
CREATE TABLE IF NOT EXISTS analytics_alert_deliveries (
  id BIGSERIAL PRIMARY KEY,
  dedupe_key VARCHAR(160) NOT NULL,
  visitor_id VARCHAR(64),
  session_id VARCHAR(64),
  heuristic_name VARCHAR(64),
  channel VARCHAR(32) NOT NULL CHECK (channel IN ('phone_push', 'email', 'webhook', 'console', 'mock')),
  outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('sent', 'failed', 'deduplicated')),
  http_status INT,
  latency_ms INT,
  error_message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Immutable Admin Security & Mutation Audit Log (OBS-09, SEC-06)
CREATE TABLE IF NOT EXISTS analytics_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_ip VARCHAR(64),
  actor_label VARCHAR(64) NOT NULL DEFAULT 'admin',
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(32),
  target_value VARCHAR(160),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. INDEXES & RETENTION POLICIES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_visitor_created ON analytics_events(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type_created ON analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_ip_created ON analytics_events(ip_address, created_at DESC) WHERE ip_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON analytics_sessions(last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON analytics_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_started ON analytics_sessions(visitor_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON analytics_visitors(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_ip ON analytics_visitors(ip_address) WHERE ip_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON analytics_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_visitor_id ON analytics_leads(visitor_id);
CREATE INDEX IF NOT EXISTS idx_ops_kind_created ON analytics_ops_metrics(metric_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_dedupe_expires ON analytics_alert_deliveries(dedupe_key, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON analytics_audit_logs(created_at DESC);
```

**Retention Policy for 12+ Month Analytics Collection (Scheduled via Vercel Cron `GET /api/ops/cleanup` protected by `CRON_SECRET`):**
- **Behavioral analytics (`analytics_events` excluding `heartbeat`, `analytics_sessions`, `analytics_visitors`):** Retain **at least `365–540` days (12–18 months)** to support full-year seasonality, repeat-fleet cohort, and catalog-demand analysis.
- Delete `analytics_events WHERE event_type = 'heartbeat' AND created_at < NOW() - INTERVAL '30 days'` (keeps 1-year tables fast and compact).
- Delete `analytics_ops_metrics WHERE created_at < NOW() - INTERVAL '90 days'`.
- Delete `analytics_alert_deliveries WHERE expires_at < NOW() - INTERVAL '30 days'`.
- Retain `analytics_leads` (form backups), `analytics_audit_logs`, `analytics_restrictions`, and `analytics_flags` indefinitely.

### 4.2 Correctness, Security & Restriction Fixes (`BUG-*`, `SEC-*`)

| ID | Target File & Symbol | Exact Implementation Specification |
|---|---|---|
| **`BUG-01`** | `lib/analytics/db.ts` `ingestEvents` (`106-176`) | **Order matters for FK `23503`:** (1) Upsert `analytics_visitors` **first** with `total_sessions = 0` on initial `INSERT` and `ON CONFLICT (visitor_id) DO UPDATE` updating `last_seen_at`/geo/device/IP *without* overwriting `total_sessions`. (2) Upsert `analytics_sessions` **second** with `RETURNING (xmax = 0) AS is_new_session`. (3) Only when `is_new_session === true`, execute `UPDATE analytics_visitors SET total_sessions = total_sessions + 1 WHERE visitor_id = $1`. Run the idempotent §4.1 backfill `UPDATE` to repair historical rows. |
| **`BUG-02`** | `lib/analytics/stats.ts` `getDashboardStats` (`58,64-67`) | Remove `AVG(s.duration_seconds)` from `kpiRes` joined over `analytics_events`. Compute `avg_duration_seconds` in a dedicated session query (or CTE): `SELECT COALESCE(ROUND(AVG(s.duration_seconds)), 0) AS avg_duration_seconds FROM analytics_sessions s LEFT JOIN analytics_visitors v ON s.visitor_id = v.visitor_id WHERE ${sessionTimeCond} AND (v.browser IS NULL OR (v.browser NOT ILIKE '%headless%' AND v.browser NOT ILIKE '%bot%'))`. |
| **`BUG-03`** | `lib/analytics/stats.ts` `pageDwellStats` (`387-408`), `page.tsx:5898,5911` | Normalize path (`COALESCE(NULLIF(RTRIM(LOWER(SPLIT_PART(e.page_path, '?', 1)), '/'), ''), '/') AS page_path`) and `GROUP BY 1` (keeping `AS page_path` so `stats.ts:388` and `page.tsx:5911` `p.page_path` match verbatim; `COALESCE(MAX(e.page_title), MAX(e.page_path)) AS page_title`), count `pageview`s explicitly (`COUNT(CASE WHEN e.event_type = 'pageview' THEN 1 END) AS views`), keep numeric regex inside `CASE` (never in `WHERE`) wrapped in `COALESCE(..., 0)`: `COALESCE(ROUND(AVG(CASE WHEN e.event_type = 'section_view' AND (e.metadata->>'dwellSeconds') ~ '^[0-9]+([.][0-9]+)?$' THEN (e.metadata->>'dwellSeconds')::numeric END), 1), 0) AS avg_dwell_seconds`. Rename UI column header to **"Avg. Section Dwell"** and render `Number(p.avg_dwell_seconds ?? 0).toFixed(1) + 's'` so `NULL` never renders `"s"`. |
| **`BUG-04`** | `lib/analytics/stats.ts` `getProductEnquiryPerformance` (`773-793`) | Normalize path in SQL: `SELECT COALESCE(NULLIF(RTRIM(LOWER(SPLIT_PART(e.page_path, '?', 1)), '/'), ''), '/') AS page_path, COUNT(*) AS views, COUNT(DISTINCT e.session_id) AS view_sessions FROM analytics_events e LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id WHERE e.event_type = 'pageview' AND LOWER(SPLIT_PART(e.page_path, '?', 1)) LIKE '/products/%/%' AND ${eventTimeCond} GROUP BY 1`. Keep `AnalyticsProvider.tsx:36` recording full URL while SQL strips `?query` and trailing slashes. |
| **`BUG-05`** | `lib/analytics/stats.ts` `getProductEnquiryPerformance` (`720-888`), `page.tsx:175` | (1) Alias `FROM analytics_events e LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id` in `clickRows` (`stats.ts:754-769`) so `baseAdminExclude` applies to both `clickRows` and `viewRows`, and normalize `cPath` via lowercase + query-strip + trailing-slash trim. (2) Return `ARRAY_AGG(DISTINCT e.session_id) FILTER (WHERE LOWER(SPLIT_PART(e.page_path, '?', 1)) LIKE '/products/%/%' AND e.session_id IS NOT NULL) AS detail_session_ids` in `clickRows` and union matched rows into a JS `Set<string>` per product (`detail_enquiry_sessions = detailSessionSet.size`) so multi-row matches in one session never overcount. (3) Preserve `enquire_clicks: number` on `ProductEnquiryStat` (`21` property accesses / `25` token occurrences in `page.tsx` stay green under `tsc --noEmit`) set to `total_enquiries = detail_enquiries + listing_enquiries`, alongside new fields `detail_enquiries`, `listing_enquiries`, `total_enquiries`, `view_sessions`, and `detail_enquiry_sessions`. (4) Compute `conversion_rate` over unique sessions: `view_sessions > 0 ? Math.min(100, Math.round((detail_enquiry_sessions / view_sessions) * 100)) : 0`. |
| **`BUG-06`** | `lib/analytics/stats.ts` `suspiciousDwellSessions` (`476`) | Change `const partCopies = Number(s.part_copies_count) \|\| copies;` to `const partCopies = s.part_copies_count !== undefined && s.part_copies_count !== null ? Number(s.part_copies_count) : copies;`. |
| **`BUG-07`** | `lib/analytics/flags.ts` (`287`) | Change cumulative SQL copy count to match `isPartNumberCopy` criteria: `COUNT(CASE WHEN e.event_type = 'copy' AND (e.metadata->>'itemType' = 'part_number' OR e.element_tag = 'part-number') AND LENGTH(COALESCE(e.metadata->>'copiedText','')) <= 24 AND COALESCE(e.metadata->>'copiedText','') ~ '[0-9]' THEN 1 END) AS total_copies`. |
| **`BUG-08`** | `app/admin/analytics/page.tsx` (`1496-1514,2306`), `stats.ts` (`125,146,169,194`) | (1) Display `stats.kpis.totalVisitors` (with subtitle `"Period total"`) on the GSC `Unique Visitors` scorecard instead of summing per-bucket `chartTotals.totalVisitors`. (2) Use a shared SQL predicate constant `LEAD_CLICK_SQL` (`element_target LIKE '%wa.me%' OR element_target ILIKE '%whatsapp%' OR element_text ILIKE '%whatsapp%' OR element_target LIKE 'tel:%' OR element_text ILIKE '%call%'`) across `kpis`, `timeSeries.leads`, and geo `inquiries_count` (including `form_submit`). |
| **`BUG-09`** | `lib/analytics/stats.ts` (`276-303`) | Run an uncapped aggregate query `SELECT COUNT(*) AS total_searches, COUNT(CASE WHEN COALESCE((metadata->>'zeroResults')::boolean, false) THEN 1 END) AS zero_results_searches FROM analytics_events e LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id WHERE e.event_type = 'search' AND (metadata->>'query') IS NOT NULL AND ${eventTimeCond}` for `searchSummary`, keeping `LIMIT 30` (or `50`) only for the display table `searchQueries`. |
| **`BUG-10`** | `components/TargetedAssistanceModal.tsx` (`137-169`) | Route submission through `POST /api/leads` (`PROD-01`), or verify `const data = await res.json(); if (!res.ok \|\| (!data.id && !data.success)) throw new Error(...)` before calling `tracker.identify`, `tracker.trackForm('submit', ...)`, and `setSubmitSuccess(true)`. On failure, emit `form_submit_error` and keep modal open showing `errorMessage`. |
| **`BUG-11`** | `app/admin/analytics/page.tsx` (`1238,1242-1260`) | Change `getWhatsAppTestUrl` phone to `918334887009`. When `inspectedProduct` opens, fetch `POST /api/analytics` `{ view: 'product_events', productSlug, partNumber, title, range: timeRange, limit: 50 }` rather than filtering the 100-event global stream cache. |
| **`BUG-13`** | `lib/analytics/encoder.ts` (`91-94`), `ProductsPage.tsx` (`155`), `page.tsx` (`943-980,1530-1546`) | (1) In `decodePayload`, map raw JSON objects through `expandEvent` (`return list.map(expandEvent)`). (2) In `ProductsPage.tsx`, reset `lastTrackedQueryRef.current = ''` when `searchTerm.trim() === ''`. (3) Extract `getIndustrialCluster(city, region)` into `lib/analytics/clusters.ts` and reuse across Tab 3 and Tab 5. |
| **`BUG-14`** | `lib/analytics/stats.ts` (`547,601-639`), `lib/analytics/geo.ts` (`43-44`), `app/api/analytics/route.ts` (`94`) | (1) Add `AND e.event_type != 'heartbeat'` by default in `getRecentEvents` (unless `options.includeHeartbeat === true` or `options.eventType === 'heartbeat'`). (2) Skip `evaluateAndRecordFlag` if batch contains only `heartbeat` events (`events.every(e => e.eventType === 'heartbeat')`). (3) Fix RFC1918 regex in `geo.ts`: `/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/`. |
| **`BUG-15`** | `stats.ts`, `Contact.tsx`, `ProductsPage.tsx`, `lib/products.ts` | Remove unused `deadClicks` KPI & `topPages` query from `getDashboardStats`; delete `public/products.json`, `components/AIPartsAssistant.tsx`, `components/ComingSoon.tsx`; remove unused `onProductEnquire` prop in `Contact.tsx` & `HomeClient.tsx` and unused `filterAvailability` in `ProductsPage.tsx`. |
| **`SEC-01`** | `app/api/flags/route.ts:8`, `app/api/restrictions/route.ts:8`, `app/api/analytics/route.ts:263,280-298` | Add `if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });` and `Cache-Control: private, no-store` to `GET /api/flags` and `GET /api/restrictions`. Remove raw `databaseError` from public `GET /api/analytics?check=status` (`295`, return only when `isAuthorized(req)`) and remove `details: error?.message \|\| String(error)` from `POST /api/analytics` `500` response (`263`, log server-side only). |
| **`SEC-02`** | `lib/analytics/auth.ts`, `app/api/analytics/route.ts:161-181`, `lib/analytics/flags.ts`, `app/api/indexnow/route.ts` | (1) Consolidate `action: 'login'` (`route.ts:161-181`) into `lib/analytics/auth.ts` (`verifyAdminKey`, `createSignedSessionToken`, `verifySignedSessionToken`); fail closed if `NODE_ENV === 'production' && !process.env.ADMIN_ANALYTICS_KEY` (dev fallback `'mmearth@2026'` only when `NODE_ENV !== 'production'`). (2) Sign `mm_analytics_auth` cookie with HMAC-SHA256 (`exp.nonce.sig` where `exp` is **Unix seconds** `Math.floor(Date.now()/1000) + 2592000`) and verify with an equal-length `Buffer` guard (`if (a.length !== b.length) return false`) before `crypto.timingSafeEqual(a, b)`. (3) Move `INDEXNOW_KEY` and `EXEMPT_TEST_CONTACTS`/`EXEMPT_TEST_NAMES` to `process.env`. |
| **`SEC-03`** | `lib/restrictions-static.ts`, `lib/restrictions-server.ts`, `middleware.ts`, `app/api/internal/restrictions/route.ts`, `app/api/internal/ops-block/route.ts`, `app/api/visitor-status/route.ts`, `lib/analytics/db.ts:252-270` | (1) Split Edge-safe `lib/restrictions-static.ts` (`RESTRICTED_VISITOR_IDS`, `isStaticRestrictedVisitor`) from Node/PG `lib/restrictions-server.ts` (`isVisitorOrIpRestricted` with 15s cache). In `lib/analytics/db.ts:252-270`: update `addRestriction` (`252-258`) to normalize `const cleanVal = value.trim().toLowerCase()` and change the legacy single-column conflict target at `257` to `ON CONFLICT ((LOWER(value))) DO UPDATE SET note = COALESCE(EXCLUDED.note, analytics_restrictions.note)` (required by PostgreSQL to match expression index `idx_restrictions_value_lower`), and update `removeRestriction` (`269`) to `DELETE FROM analytics_restrictions WHERE LOWER(value) = LOWER($1)` (`[String(identifierOrId).trim()]`). (2) Keep `middleware.ts` Edge-compatible (never importing `pg` or Node `'crypto'`): fetch `GET /api/internal/restrictions` with `x-internal-secret` (using Web Crypto `crypto.subtle` for the non-prod dev fallback; §4.4.3) and log `middleware_block` via `event.waitUntil(fetch(\`\${origin}/api/internal/ops-block\`, ...))`. (3) Share `isVisitorOrIpRestricted` in `/api/products/search`, `/api/analytics`, `/api/collect`, and `GET /api/visitor-status`; update client components to read `GET /api/visitor-status` (60s `sessionStorage` cache). |
| **`SEC-04`** | `app/api/analytics/route.ts`, `app/api/collect/route.ts`, `lib/analytics/ingestHandler.ts` | Extract shared `ingestTelemetryRequest(req, bodyText)` into `lib/analytics/ingestHandler.ts` so `/api/collect` and `/api/analytics` share bot-UA filtering, `> 65,536`-byte `413` limit, production `Origin`/`Referer` allowlist (`403` if disallowed), `<= 50` events/batch cap, and `analytics_ops_metrics` logging. Parse JSON first; if `JSON.parse` fails, allow raw obfuscated string fallback ONLY if `/^[A-Za-z0-9+/=_-]+$/` and `decodePayload` returns valid events with `visitorId` — otherwise return `400`. |
| **`SEC-05`** | `app/api/callback/route.ts:37-52` | Because `app/api/callback/route.ts:37-52` builds `<script>` inside a server-side JS template literal (`const html`), construct a backslash-free `const allowed = new RegExp('^https://([a-z0-9-]+[.])?(mmearthmovers[.]com\|vercel[.]app)$\|^http://(localhost\|127[.]0[.]0[.]1)(:[0-9]+)?$', 'i')` (avoiding regex-literal backslash stripping) and guard `receiveMessage` so `window.opener.postMessage('authorization:github:success:...', message.origin)` at `route.ts:40-46` executes only after `message.origin === window.location.origin \|\| allowed.test(message.origin)` passes (allowing `mmearthmovers.com`, Vercel previews `*.vercel.app`, `localhost`, and `http://127.0.0.1:3000`, while noting `route.ts:50`'s initial `"authorizing:github"` handshake to `window.opener`). |
| **`SEC-06`** | `app/api/analytics/route.ts`, `flags/route.ts`, `restrictions/route.ts` | Write `analytics_audit_logs` on every `login` (success & fail), `logout`, `add_restriction`, `remove_restriction`, `add_flag`, and `remove_flag`. Add sliding-window in-memory + DB-backed login rate limit (`5` failed attempts / 15 min / IP -> `429 Too Many Requests`). |

### 4.3 Client SDK, Event Taxonomy & Storefront Instrumentation

#### A. Extended TypeScript Event Schema (`lib/analytics/tracker.ts`)

```ts
export type AnalyticsEventType =
  | 'pageview'
  | 'click'
  | 'rage_click'
  | 'copy'
  | 'section_view'
  | 'heartbeat'
  | 'search'
  | 'identify'
  | 'form_start'
  | 'form_validation_error'
  | 'form_abandon'
  | 'form_submit'
  | 'form_submit_error'
  | 'video_play'
  | 'video_progress'
  | 'video_complete'
  | 'video_switch'
  | 'image_zoom'
  | 'spec_toggle'
  | 'related_product_click'
  | 'placeholder_impression'
  | 'model_faq_accordion_toggle'
  | 'model_sibling_switcher_card'
  | 'export_banner_view'
  | 'loading_screen_timing'
  | 'not_found'
  | 'client_error'
  | 'client_ops'
  | 'review_redirect';
```

*(Decision on `dead_click`: cleanly remove the unimplemented `deadClicks` counter from `stats.ts:63,82` and `DashboardStats` in `page.tsx:18` instead of tracking generic non-interactive text-selection clicks, as `rage_click` + `client_error` already capture UX friction without noise.)*

#### B. Exact Storefront Instrumentation Map

| Event Type | Trigger & Exact Metadata Payload | Capture Component & Line Hook | Dual-Dispatch GA4 (`gtag`) |
|---|---|---|---|
| `click` (`placement`) | Add `data-placement` & `data-track` to all CTAs; auto-capture `metadata.placement` in `setupAutoClickTracking` (`tracker.ts:299`) | `WhatsAppButton.tsx:33` (`floating_whatsapp`), `app/products/[category]/[slug]/page.tsx:370` (`product_detail_enquire`), `ProductsPage.tsx` / `ModelProductGrid.tsx` card CTAs (`product_grid_enquire`), `app/models/[slug]/page.tsx:319` (`model_hero_wa`), `ModelProductGrid.tsx:167` (`model_empty_wa`), `ModelProductGrid.tsx:219` (`model_unlisted_wa`), `ModelProductGrid.tsx:426` (`model_zero_results_wa`), `ExportInfo.tsx:57` (`export_banner_wa`), `Contact.tsx:258-289` (`contact_maps`, `contact_call`, `contact_email`, `contact_whatsapp`), `Contact.tsx:331` (`contact_error_wa`), `TargetedAssistanceModal.tsx:369,380` (`modal_whatsapp`, `modal_call`), `ProductsPage.tsx:298` (`excavator_banner_wa`), `ProductPlaceholderImage.tsx:138` (`placeholder_photo_wa`), `app/not-found.tsx` (`not_found_wa`) | `generate_lead` (when `wa.me` or `tel:`) |
| `form_start` / `form_validation_error` / `form_abandon` / `form_submit` / `form_submit_error` | `formName`: `'Contact Form' \| 'Targeted Assistance Modal'`; `fieldName`, `errorReason` on blur/submit validation; `filledFieldsCount` on unload/modal close if started & not submitted; `httpStatus`/`errorCode` on failure | `Contact.tsx` (`handleChange` first touch -> `form_start`, `handleBlur`/`validateForm` -> `form_validation_error`, `beforeunload` -> `form_abandon`, `handleSubmit` -> `form_submit` / `form_submit_error`); `TargetedAssistanceModal.tsx` (same + modal close `✕`/Esc -> `form_abandon`) | `generate_lead` on `form_submit` |
| `search` | Include `category`, `machineSlug`, `resultsCount`, `zeroResults`, `searchSurface` (`'global_modal' \| 'products_page' \| 'model_grid'`); on result click include `selectionMethod: 'keyboard' \| 'mouse'`, `resultRank` | `GlobalSearchModal.tsx:247,305,319`, `ProductsPage.tsx:161` (reset `lastTrackedQueryRef` on clear), `ModelProductGrid.tsx:92` | `search` (`{ search_term }`) |
| `placeholder_impression` | `{ productSlug, partNumber, category, hasImage: false, surface: 'catalog_card' \| 'detail_hero' }` (deduped in `sessionStorage` once per session per SKU + surface via `IntersectionObserver` / mount) | `ProductPlaceholderImage.tsx` (used in `ProductsPage.tsx:349-369`, `ModelProductGrid.tsx:317-337`, `ProductImageZoom.tsx:33-58`, `app/products/[category]/[slug]/page.tsx:426-430`) | None |
| `image_zoom` | `{ action: 'open' \| 'close', productSlug, productTitle, category, durationMs? }` | `ProductImageZoom.tsx:64,82,88` | `view_item` (or custom `image_zoom`) |
| `spec_toggle` | `{ open: boolean, productSlug, partNumber, category }` | `app/products/[category]/[slug]/page.tsx:260` (extracted `'use client'` `<ProductDetailsAccordion>` `<details onToggle>` wrapper) | None |
| `related_product_click` | `{ sourceProductSlug, targetProductSlug, targetTitle, targetPartNumber, position, heading }` | `app/products/[category]/[slug]/page.tsx:415,436` (`data-track="related_product_click"`, `data-source-slug`, `data-product-slug`, `data-target-title`, `data-target-part-number`, `data-position`) + `lib/analytics/tracker.ts:291-330` (see B1) | `select_item` |
| `model_faq_accordion_toggle` | `{ open: boolean, machineSlug, faqIndex, question }` | `app/models/[slug]/page.tsx:414` (extracted `'use client'` `<ModelFaqAccordion>` `<details onToggle>` wrapper; removes `data-track="model_faq_accordion_toggle"` from `<details>` so `setupAutoClickTracking` at `lib/analytics/tracker.ts:292` does not emit a duplicate `'click'` alongside `onToggle`) | None |
| `model_sibling_switcher_card` | `{ sourceMachineSlug, targetMachineSlug, targetMachineName, position }` | `app/models/[slug]/page.tsx:376-396` (`data-track="model_sibling_switcher_card"`, `data-source-machine-slug`, `data-target-machine-slug`, `data-machine-name`, `data-position`) + `lib/analytics/tracker.ts:291-330` (see B1) | `select_item` |
| `export_banner_view` | `{ country, countryCode, source: 'ipapi.co', pagePath }` (once per session per page) | `ExportInfo.tsx:16-20`, `hooks/useGeoLocation.ts:28-48` | None |
| `client_ops` | `{ target: 'ipapi_co', outcome: 'ok' \| 'http_error' \| 'timeout' \| 'error', statusCode?, durationMs }` (throttled once per session; routed server-side into `analytics_ops_metrics`) | `hooks/useGeoLocation.ts:28-48` (`performance.now()` timing around `fetch('https://ipapi.co/json/')`) | None |
| `video_play` / `video_switch` / `video_complete` | `{ videoIndex, videoSrc, trigger: 'auto' \| 'prev' \| 'next' \| 'dot' \| 'swipe', isMobile, error? }` | `VideoCarousel.tsx:38,65,89,102-112` | None |
| `loading_screen_timing` | `{ waitDurationMs, hitFallback12s: boolean, dismissedNormally: boolean, bouncedBeforeDismiss: boolean }` | `HomeClient.tsx:86-117` + `visibilitychange` listener while `isLoading === true` | None |
| `not_found` | `{ requestedPath: window.location.pathname, referrer: document.referrer, inferredPartNumber }` + `data-track="not_found_category_card" \| "not_found_whatsapp"` | `app/not-found.tsx:41-177` | None |
| `client_error` | `{ message, source, lineno, colno, kind: 'error' \| 'unhandledrejection' \| 'react_boundary' }` (throttled max 5/session) | `components/AnalyticsProvider.tsx` global listeners + new `app/error.tsx` | None |
| `review_redirect` | Server-side route (`export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';`, `GET(req: NextRequest)`): read `mm_vid` cookie or generate `crypto.randomUUID()` (setting cookie if absent), **upsert `analytics_visitors` first** with `total_sessions = 0` on initial `INSERT` (`ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP`, leaving `total_sessions` unchanged so `BUG-01` never double-counts if a session starts later), then `INSERT INTO analytics_events (event_type = 'review_redirect', metadata: { source: searchParams.get('src'), referer, userAgent })` before returning redirect HTML | `app/add-review/route.ts:3-49` | None |

#### B1. `setupAutoClickTracking` Event-Type & Placement Dispatch (`lib/analytics/tracker.ts:291-330`)

Update `setupAutoClickTracking` in `lib/analytics/tracker.ts:291-330` so declarative `data-*` attributes on Server Components emit typed events instead of generic `'click'` payloads:
1. Read `trackLabel = clickable.getAttribute('data-track') || undefined` and `placement = clickable.getAttribute('data-placement') || undefined`.
2. When `trackLabel === 'related_product_click'`, read `data-source-slug`, `data-position`, `data-target-title`, `data-target-part-number`, `data-product-slug` (plus optional `data-heading`) and emit `this.track('related_product_click', { elementText: text || targetTitle || 'Related Product', elementTarget: href, elementTag: tag, metadata: { trackLabel, sourceProductSlug, targetProductSlug: productSlug, targetTitle, targetPartNumber, position: position ? Number(position) : undefined, heading } })`.
3. When `trackLabel === 'model_sibling_switcher_card'`, read `data-source-machine-slug`, `data-target-machine-slug` (fallback `data-machine-slug`), `data-machine-name`, `data-position` and emit `this.track('model_sibling_switcher_card', { elementText: text || targetMachineName || 'Sibling Model', elementTarget: href, elementTag: tag, metadata: { trackLabel, sourceMachineSlug, targetMachineSlug, targetMachineName, position: position ? Number(position) : undefined } })`.
4. For all other interactive elements, emit `this.track('click', { elementText: text || trackLabel || 'Icon Button', elementTarget: href, elementTag: tag, metadata: { trackLabel, placement, ...productContext } })`.

#### C. GA4 & Vercel `/admin/*` Exclusion Wrapper (`components/TelemetryScripts.tsx` & `app/layout.tsx`)

- Extract GA4 `<Script>` tags (`G-RHFEC523K9`) and Vercel `<Analytics />` from Server Component `app/layout.tsx:159-179` into a `'use client'` `components/TelemetryScripts.tsx` component using `usePathname()`.
- Return `null` when `pathname?.startsWith('/admin')` so admin sessions never pollute GA4 or Vercel Analytics, and expose `lib/analytics/ga4.ts` (`dispatchGa4Event(name, params)`) safely guarding `typeof window !== 'undefined' && typeof window.gtag === 'function'`.

#### D. Client Unload & Byte-Chunked Retry Queue (`lib/analytics/tracker.ts`)

Replace silent `.catch(() => sendBeacon)` (`tracker.ts:243-257`) with a resilient dual-path dispatcher:
1. Assign each batch a client `batchId = crypto.randomUUID()`.
2. **Active session flush:** Use `fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true })`. If `fetch` throws or `!res.ok` (`res.status >= 500` or `429`), push items into `localStorage['mm_retry_queue']` (capped at `50` events, oldest evicted) and schedule exponential backoff retry (`2s`, `8s`, `30s`) on next flush or page load.
3. **Byte-size chunking (`<= 48 KB`):** Before encoding/sending any retry or normal queue flush, slice batches so each encoded `{ d }` JSON payload is `<= 49,152` bytes (`48 KB`), preventing `SEC-04`'s `65,536`-byte `413 Payload Too Large` rejection.
4. **Page unload (`visibilitychange` hidden / `pagehide`):** Retain `navigator.sendBeacon(this.endpoint, new Blob([chunkedPayload], { type: 'text/plain' }))` as the unload transport fallback when `fetch(..., { keepalive: true })` fails or when queued chunks exceed browser `keepalive` headroom.

### 4.4 Backend API Contracts, Ingestion Resilience & External Integration Observability

#### 1. `POST /api/leads` (Form Submission Proxy & Immutable Backup Log — No CRM)
- **Request JSON:**
  ```json
  {
    "source": "contact_form | targeted_modal",
    "placement": "contact_section | modal_form | product_detail_enquire | ...",
    "name": "string (optional for targeted_modal, required for contact_form)",
    "company": "string (optional)",
    "contact": "string (required, valid email or 10-15 digit phone)",
    "message": "string (min 10 chars for contact_form, optional for targeted_modal)",
    "productSlug": "string (optional)",
    "partNumber": "string (optional)",
    "machineSlug": "string (optional)",
    "searchQuery": "string (optional)",
    "visitorId": "string (optional, from mm_vid)",
    "sessionId": "string (optional, from mm_sid)"
  }
  ```
- *(Note: Outbound `wa.me`/`tel:` clicks are tracked in `analytics_events` under `BI-02`. No CRM status/quote APIs (`GET /api/leads`, `PATCH /api/leads/[id]`) or manual CRM entry are included.)*
- **Server Execution Flow:**
  1. Validate fields server-side (mirroring `Contact.tsx` / `TargetedAssistanceModal.tsx` rules); return `400 { error, fieldErrors }` on invalid input.
  2. Resolve `clientIp` & `extractGeolocation(req.headers)`.
  3. **Upsert `analytics_visitors` first** whenever `visitorId` is present (`INSERT INTO analytics_visitors (visitor_id, total_sessions, ip_address, country, country_code, region, city, identified_name, identified_contact) VALUES ($1, 0, ...) ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP, identified_name = COALESCE(EXCLUDED.identified_name, analytics_visitors.identified_name), identified_contact = COALESCE(EXCLUDED.identified_contact, analytics_visitors.identified_contact)` — leaving `total_sessions` unchanged on conflict) — or pass `visitor_id = NULL` if `visitorId` is absent.
  4. **Persist immutable backup** into `analytics_leads` (`delivery_status = 'pending'`, returning `id` and `lead_uuid`).
  5. Forward server-side to StaticForms (`https://api.staticforms.xyz/submit` using `process.env.STATICFORMS_ACCESS_KEY`) mapping `contact` -> `'contact-info'` and setting `replyTo: '@'`, wrapped in `withOpsMetric('external_call', 'staticforms', ...)`.
  6. If StaticForms fails or times out (`2500ms`), trigger backup alert (`Resend` / `ntfy.sh`) and update `delivery_status = 'fallback_sent'` or `'failed'`.
- **Response (`201 Created` whenever persisted to PostgreSQL):**
  ```json
  { "success": true, "leadId": "uuid", "id": 123, "deliveryStatus": "sent | fallback_sent | failed" }
  ```

#### 2. 1-Year Time Range & Monthly Series Support (`TimeRange = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '1y' | 'all'`)
- Extend `TimeRange` in `lib/analytics/stats.ts` and `app/admin/analytics/page.tsx` with `90d` (`89 days`) and `1y` (`364 days`).
- For `timeRange === '1y' || timeRange === 'all'`, bucket `timeSeries` by `'YYYY-MM'` (`TO_CHAR(e.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM')`) instead of daily `'YYYY-MM-DD'` so 12-month charts remain readable and fast.
- Include `persistedFormSubmissions` count from `analytics_leads` in `getDashboardStats` alongside `formLeads`, `whatsappClicks`, and `phoneCalls`.

#### 3. Internal Edge Middleware Endpoints (`GET /api/internal/restrictions` & `POST /api/internal/ops-block`)
- **Edge Runtime (`middleware.ts`) vs Node.js Runtime (`/api/internal/*`):** `middleware.ts` runs in Next.js Edge Runtime (which forbids importing Node `'crypto'` or `'pg'`), so when `process.env.INTERNAL_API_SECRET` is unset in non-production (`NODE_ENV !== 'production'`), `middleware.ts` derives `x-internal-secret` using **Web Crypto** (`crypto.subtle.importKey` + `crypto.subtle.sign('HMAC', ...)` with `process.env.ADMIN_ANALYTICS_KEY || 'mmearth@2026'` and message `'mm-internal'`; in production without `INTERNAL_API_SECRET`, fail closed and deny/skip internal sync).
- Both `/api/internal/restrictions` and `/api/internal/ops-block` declare `export const dynamic = 'force-dynamic'; export const runtime = 'nodejs';` and verify `x-internal-secret` using Node **`crypto.timingSafeEqual`** with an equal-length `Buffer` guard (`if (a.length !== b.length) return false`) against `process.env.INTERNAL_API_SECRET` (or the matching Node `crypto.createHmac('sha256', ADMIN_ANALYTICS_KEY || 'mmearth@2026').update('mm-internal').digest('hex')` fallback only when `NODE_ENV !== 'production'`; fail closed `401` otherwise).
- `GET /api/internal/restrictions`: Returns `{ visitorIds: string[], ips: string[] }` (lowercase trimmed, zero `note` PII) with `Cache-Control: private, no-store` for `middleware.ts:18` (15s Edge memory cache).
- `POST /api/internal/ops-block`: Accepts `{ targetName, outcome, statusCode?, durationMs?, metadata? }` dispatched by `middleware.ts`'s `event.waitUntil(fetch(\`\${origin}/api/internal/ops-block\`, ...))` (`NextFetchEvent` parameter) and writes `metric_kind = 'middleware_block'` into `analytics_ops_metrics`.

#### 4. `GET /api/visitor-status` (Public, Privacy-Safe)
- Reads `mm_vid` cookie (or `?vid=` query param) + `clientIp`, evaluates server-side `isVisitorOrIpRestricted(vid, ip)` (`lib/restrictions-server.ts`) against DB `analytics_restrictions` + static fallback (15s cache).
- **Response (`200`, `Cache-Control: private, no-store`):** `{ "restricted": true | false }`. Never returns the list of restricted IPs or visitor IDs.

#### 5. Updated `POST /api/analytics` & `/api/collect` Contracts
- **Telemetry Ingest (`lib/analytics/ingestHandler.ts`):**
  - `POST /api/collect` delegates to shared `ingestTelemetryRequest(req, bodyText)`.
  - Enforce `Buffer.byteLength(bodyText, 'utf8') > 65536` -> `413`; enforce production `Origin`/`Referer` allowlist -> `403`; parse JSON first and fall back to raw obfuscated string ONLY when `/^[A-Za-z0-9+/=_-]+$/` and `decodePayload` yields `>= 1` valid event with `visitorId` (else `400`); cap batches at `<= 50` events.
  - Route incoming `eventType === 'client_ops'` (`hooks/useGeoLocation.ts` `ipapi_co` SLA probes) into `analytics_ops_metrics` (`metric_kind = 'external_call'`, `target_name = 'ipapi_co'`, throttled 1/session) without polluting the behavioral event stream.
  - Log batch outcomes (`ok`, `rejected`, `error`, `duration_ms`) via buffered single-batch flush into `analytics_ops_metrics` (`metric_kind = 'ingest_batch'`).
  - Return `204` on success, `500` (sanitized `{ error: 'Internal error' }`, no `details` string per `SEC-01`) on transient DB failure so client retry queue triggers instead of silently losing batches.
- **New Admin Views (`POST /api/analytics` with `isAuthorized(req)`):**
  - `view: 'product_events'`: `{ productSlug, partNumber, title, range, limit }` -> returns `{ events }` directly from PostgreSQL for the Product Inspector Drawer (`BUG-11`).
  - `view: 'visitors'`: Add server-side `search`, `segment`, `device`, `limit`, `offset`, returning `{ visitors, totalCount, summaryCounts }` (`PROD-08`).
  - `view: 'ops_health'`: `{ range }` -> returns ingestion success rate, API p50/p95/5xx by route, DB pool stats (`totalCount`, `idleCount`, `waitingCount`) + `catalog_cache` hit/miss ratio, external integration SLAs (including `ipapi_co`), persistent alert deliveries, Edge `middleware_block` stats, `404` URLs, `LoadingScreen` p50/p95/fallback rate, and client JS error counts.
  - `view: 'audit_logs'`: `{ limit, offset }` -> returns `{ logs }` from `analytics_audit_logs`.

#### 6. Persistent Alert Deduplication, CTE Pool Safety & Non-Recursive `withOpsMetric` (`lib/analytics/alert.ts`, `lib/analytics/ops.ts`, `lib/products.ts`)
- **Alert Dedupe (`alert.ts`):** Replace `checkAndRecordDedupe` (`94-111`) with `checkAndRecordDedupeDb(dedupeKey, windowMs = 3600000)` querying `analytics_alert_deliveries` (`expires_at > NOW()`), keeping `alertDedupeCache` as L1 fast-path and recording every channel (`phone_push`, `email`, `webhook`) outcome (`sent`/`failed`/`deduplicated`).
- **Consolidated CTEs (`stats.ts`):** Replace the 14 sequential/parallel queries in `getDashboardStats` with **3–4 consolidated CTE queries** so `max: 4` pool (`lib/analytics/db.ts:31`) is never exhausted under concurrent dashboard tabs.
- **Non-Recursive, Serverless-Safe `withOpsMetric` (`ops.ts`):** Wrap `ip-api.com` (`geo.ts:113`), `StaticForms`, `IndexNow`, `GitHub OAuth`, and API routes in `withOpsMetric(kind, targetName, fn)` which pushes metrics into a per-request buffer. Flush the buffer with a **single batched `INSERT INTO analytics_ops_metrics`** via raw `pool.query` (explicitly bypassing `db_query` instrumentation so `analytics_ops_metrics` writes never trigger recursive `withOpsMetric` calls!) right before returning the HTTP response (wrapped in non-fatal `try/catch` with `250ms` timeout so Serverless Lambda freeze never drops metrics, or `waitUntil` if `@vercel/functions` is later added).
- **Catalog Cache (`lib/products.ts`):** Cache parsed 144 `.md` files in module memory keyed by `fs.statSync(productsDirectory).mtimeMs` (plus per-file `mtimeMs` check or 60s TTL), emitting `catalog_cache` (`cache_hit` / `cache_miss`) to the request ops buffer.

#### 7. `stats.ts` SQL Aggregations for New Insights & Ops Views (`BI-02`–`BI-10`, `OBS-01`–`OBS-09`)

| Insight / View | `stats.ts` Function / Section | Exact SQL Aggregation & Return Shape |
|---|---|---|
| `BI-02` Placement Attribution | `placementAttribution` (in `getDashboardStats` CTE) | `SELECT COALESCE(NULLIF(e.metadata->>'placement',''), 'untagged') AS placement, COUNT(*) AS clicks, COUNT(DISTINCT e.session_id) AS unique_sessions FROM analytics_events e LEFT JOIN analytics_visitors v ON e.visitor_id = v.visitor_id WHERE e.event_type = 'click' AND (NULLIF(e.metadata->>'placement','') IS NOT NULL OR (${LEAD_CLICK_SQL})) AND ${eventTimeCond} GROUP BY 1 ORDER BY clicks DESC` + `LEFT JOIN` counts from `analytics_leads` grouped by `placement` (note: `LEFT JOIN analytics_visitors v` is required because `${eventTimeCond}` embeds `baseAdminExclude` referencing `v.browser`, and `NULLIF(e.metadata->>'placement','') IS NOT NULL` ensures `contact_maps` and `contact_email` are included in the 18-placement `placementAttribution` table). |
| `BI-03` Search Funnel & Rank CTR | `searchFunnelStats` (in `getDashboardStats` CTE) | Aggregate `totalSearches`, `zeroResultsSearches`, and `searchSurface` from `event_type = 'search'`; aggregate `rankBuckets` (`resultRank = 1`, `2-3`, `4+`) and `selectionMethodCounts` (`selectionMethod`: `'keyboard'` vs `'mouse'`) from `event_type = 'click' AND metadata->>'action' = 'search_modal_select_product'` (`GlobalSearchModal.tsx:320-336`); and compute `zeroResultRecoveryRate` across sessions with `event_type = 'search'` and `(metadata->>'zeroResults')::boolean = true` that subsequently fire `event_type = 'click'` with `metadata->>'trackLabel' IN ('search_zero_result_whatsapp', 'products_zero_results_whatsapp', 'model_zero_results_whatsapp', 'search_excavator_whatsapp')`. |
| `BI-04` Imageless & Excavator Demand | `catalogHealthGaps` (in `getProductEnquiryPerformance`) | Join `getProducts()` `hasImage = Boolean(p.image)` with `event_type = 'placeholder_impression'` (`metadata->>'productSlug'`) and `placeholder_photo_wa` clicks (`metadata->>'placement' = 'placeholder_photo_wa'`); plus Excavator demand (`page_path ILIKE '%excavator%'` pageviews, `category = 'Excavator'` searches, and `excavator_banner_wa` clicks). |
| `BI-05` Product Engagement & Recs | `productEngagementStats` (in `getDashboardStats` + `product_events`) | Aggregate `image_zoom` (`action = 'open'`), `spec_toggle` (`open = true`), `model_hub_nav` (`event_type = 'click' AND metadata->>'trackLabel' IN ('product_specs_machine_model_link', 'product_brand_machine_model_badge')`, matching `app/products/[category]/[slug]/page.tsx:214,333`), and `related_product_click` (emitted by `setupAutoClickTracking` in `tracker.ts` per §4.3 B1 with `sourceProductSlug`, `targetProductSlug`, `position`) joined with downstream `product_detail_enquire` in the same `session_id` to compute recommendation-assisted enquiry rate. |
| `BI-06` Form Funnel & Friction | `formFunnelStats` (in `getDashboardStats`) | Group by `element_text` (`'Contact Form'` / `'Targeted Assistance Modal'`): `COUNT(DISTINCT session_id)` for `form_start`, `form_abandon`, `form_submit`, `form_submit_error`, plus top `form_validation_error` counts grouped by `(metadata->>'fieldName', metadata->>'errorReason')`. |
| `BI-07` Export & Geo Discrepancy | `exportFunnelStats` (in `getDashboardStats`) | Aggregate `export_banner_view` grouped by `metadata->>'countryCode'` vs `export_banner_wa` clicks (`ExportInfo.tsx`), plus comparison of visitor server `v.country_code` vs client `metadata->>'countryCode'` from `ipapi.co`. |
| `BI-08` Machine Model Hub & FAQ | `modelHubStats` (in `getDashboardStats`) | Aggregate `/models/%` `pageview`s (normalized `SPLIT_PART` across the 10 `MACHINE_MODELS` slugs), same-session subsequent `/products/%/%` views/enquiries, `model_faq_accordion_toggle` (`open = true`) grouped by `(metadata->>'machineSlug', metadata->>'question')`, and `model_sibling_switcher_card` transitions (`sourceMachineSlug` -> `targetMachineSlug`). |
| `BI-09` Cohort Repeat Fleet & Lift | `cohortRetentionStats` (in `getDashboardStats` + `getVisitorsList`) | Bucket `analytics_visitors.total_sessions` into `1`, `2`, `3+`; compare RFQ conversion (`LEAD_CLICK_SQL` or `analytics_leads` match) on session #1 (`Day 1`) vs session #2+ (`Day 2+`); surface first-session `utm_source`/`referrer` per IP-stitched visitor. |
| `BI-10` Review Redirect Funnel | `reviewRedirectStats` (in `getDashboardStats`) | `SELECT COALESCE(NULLIF(metadata->>'source',''), 'direct') AS source, COUNT(*) AS hits, COUNT(DISTINCT visitor_id) AS unique_visitors FROM analytics_events WHERE event_type = 'review_redirect' AND ${timeCond} GROUP BY 1 ORDER BY hits DESC`. |
| `OBS-01..09` Ops Health | `getOpsHealthStats(range)` (`view: 'ops_health'`) | Query `analytics_ops_metrics` grouped by `(metric_kind, target_name)` (`COUNT(*)`, error/rejected/timeout counts, `PERCENTILE_CONT(0.5/0.95) WITHIN GROUP (ORDER BY duration_ms)`, `catalog_cache` hit rate), `pool` gauges, `analytics_alert_deliveries` summary, `analytics_events` for `not_found` (top `requestedPath`), `client_error` (top `message`), and `loading_screen_timing` (`p50`/`p95` `waitDurationMs`, `hitFallback12s` %, `bouncedBeforeDismiss` %). |

### 4.5 `admin/analytics` Modularization & New UI Tabs/Widgets

Decompose `app/admin/analytics/page.tsx` (`8,185` lines) into:

```
app/admin/analytics/
├── page.tsx                              # Auth gate, top nav, timeRange state (incl. 90d/1y), tab router (~250 lines)
├── _types/analytics.ts                   # Shared TS interfaces (preserving enquire_clicks on ProductEnquiryStat)
├── _hooks/useAnalyticsPolling.ts         # Tab-scoped + visibilityState-aware polling hook
└── _components/
    ├── DashboardHeader.tsx               # Active online badge, IST clock, range selector (Today..1y/All), refresh controls
    ├── KpiStrip.tsx                      # 6 global KPIs (fixed avgDurationSeconds + form backup count)
    ├── LiveStreamTab.tsx                 # GSC Chart (fixed totalVisitors + YYYY-MM 1y view), Top Clicks, Feed (no heartbeats)
    ├── ProductDemandTab.tsx              # Product table/cards + BI-02 Placement Breakdown + BI-04 Missing-Photo/Excavator card + CMS deep-link
    ├── ProductInspectorDrawer.tsx        # Uses view:'product_events' + BI-05 Zoom/Spec/Related CTR + fixed +918334887009 WA test URL
    ├── AudienceGeoTab.tsx                # Unified getIndustrialCluster + Geo + Channels + BI-07 Export Funnel & ipapi.co discrepancy
    ├── SearchDwellTab.tsx                # Uncapped searchSummary + BI-03 Rank CTR/Keyboard-vs-Mouse + BI-06 Form Funnel + BI-08 Model Hubs/FAQ + Avg. Section Dwell + Sentinel
    ├── VisitorsTab.tsx                   # Server-paginated Visitor Directory + BI-09 Cohort Repeat Fleet/Return-Day Lift + BI-10 /add-review summary
    ├── OpsHealthTab.tsx                  # NEW (OBS-01..09, PROD-09): Ingest health, API/DB latency & catalog_cache hit %, External SLAs (incl. ipapi.co), Alerts, 404s, LoadingScreen p95/bounce, Client Errors, Edge Blocks, Audit Log
    ├── RestrictionsTab.tsx               # IP/Visitor ID blocklist + mobile add sheet
    └── VisitorJourneyModal.tsx           # IP-stitched multi-day session timeline
```

**Polling & Type-Safety Rules:**
- **Preserve `ProductEnquiryStat.enquire_clicks` (`_types/analytics.ts`):** Keep `enquire_clicks: number` (set to `total_enquiries`) alongside `detail_enquiries`, `listing_enquiries`, `total_enquiries`, `view_sessions`, and `detail_enquiry_sessions` so all `21` existing `.enquire_clicks` property accesses pass `tsc --noEmit`.
- **Polling Optimization (`useAnalyticsPolling.ts`):** On mount / `timeRange` change, fetch `summary` + the currently active tab's endpoint only (`2` requests instead of `5`). On 15s auto-refresh, skip tick if `document.visibilityState !== 'visible'` and refresh only `summary` + active tab data (never re-parsing 144 `.md` files via `view: 'catalog'` when viewing `visitors` or `ops`).

### 4.6 Point-by-Point Verification & Acceptance Test Plan

Once implementation begins, every item MUST pass its individual verification check below (**50/50 IDs explicitly covered**):

| ID | Verification Method | Exact Check / Command / SQL Assertion | Expected Pass Criterion |
|---|---|---|---|
| `BUG-01` | Unit + SQL | Ingest 2 batches for same `visitor_id` with distinct `session_id`s (`s1`, `s2`); run §4.1 backfill on seeded `total_sessions = 1` row; query `SELECT total_sessions FROM analytics_visitors`. | `analytics_visitors` upserted before `analytics_sessions` (0 FK errors); `total_sessions = 2` and backfilled historical rows match `COUNT(DISTINCT session_id)`. |
| `BUG-02` | Unit + SQL | Seed session A (`10s`, 100 events) and session B (`110s`, 2 events); call `getDashboardStats`. | `kpis.avgDurationSeconds = 60` (session average, not `12` event-weighted). |
| `BUG-03` | Unit + SQL + UI | Seed 10 `pageview`s and 2 `section_view`s (`dwellSeconds: 30, 50`) on `/products?utm=1` and 3 `pageview`-only hits on `/about`; render `SearchDwellTab`. | `/products` `views = 10`, `avg_dwell_seconds = 40.0`; `/about` `avg_dwell_seconds = 0.0` (never `"s"`); header labeled **"Avg. Section Dwell"**. |
| `BUG-04` | Unit + SQL | Ingest `pageview` on `/products/loader/522-2835?utm_source=google` and `/products/loader/522-2835/`; call `getProductEnquiryPerformance`. | Product `522-2835` `views >= 2` (`SPLIT_PART` + trailing-slash normalization). |
| `BUG-05` | Typecheck + SQL | Run `npx tsc --noEmit`; ingest `/admin/analytics` click + `headless` view + listing-page enquiry on 0-detail-view product + 3 detail clicks across 2 matched product rows in 1 session. | `tsc` passes (all 22 `.enquire_clicks` intact); bot/admin excluded; `detail_enquiries = 0`, `conversion_rate = 0%`, and JS `Set<string>` over `detail_session_ids` caps 1-session multi-row matches at `detail_enquiry_sessions = 1` (`<= 100%`). |
| `BUG-06` | Unit test | `node --test` calling mapper with `part_copies_count: '0', copies_count: '5', lead_actions: '0'`. | `heuristic !== 'competitor_recon'` (`partCopies === 0`). |
| `BUG-07` | Unit + Replay | Run `node --test tests/analytics/nuisance-flagging.test.mjs` + test with 3 general-text copies in DB. | All 15 existing tests pass + 0 false flags for general-text copies. |
| `BUG-08` | UI / Unit | Render `stream` tab with 2 hourly buckets sharing 1 `visitor_id` and test `wa.me`/form leads in `timeSeries` & geo tables. | GSC `Unique Visitors` scorecard equals `stats.kpis.totalVisitors` (`1`, not `2`); `LEAD_CLICK_SQL` matches across all 3 queries. |
| `BUG-09` | SQL + Unit | Insert 35 distinct search queries (5 zero-result in positions 31–35); call `getDashboardStats`. | `searchSummary.totalSearches >= 35` and `zeroResultsSearches >= 5`. |
| `BUG-10` | Playwright / Mock | Mock `POST /api/leads` returning `500` in `TargetedAssistanceModal`. | Error banner displayed; `submitSuccess` stays `false`; `form_submit` not fired; `form_submit_error` emitted. |
| `BUG-11` | Code + API check | Inspect `getWhatsAppTestUrl` output; `POST /api/analytics` `{ view: "product_events", productSlug: "522-2835" }`. | URL uses `wa.me/918334887009`; `product_events` returns DB events beyond 100-row stream cache. |
| `BUG-12` | DB migration test | Run `node scripts/init_analytics_db.js` on a clean PostgreSQL schema; inspect `\dt` and `\d`. | All 10 tables, `idx_restrictions_value_lower`, & all indexes created with exit code `0`. |
| `BUG-13` | Unit + UI test | `decodePayload(JSON.stringify({ v: 'v1', s: 's1', t: 'pageview', p: '/' }))`; clear & re-enter query in `ProductsPage`; test `getIndustrialCluster('Jamshedpur', 'JH')`. | Expands `{v,t}` cleanly; re-search emits `search`; single unified cluster label across tabs. |
| `BUG-14` | API + Unit | Ingest 100 `heartbeat` events + 5 `click` events; call `getRecentEvents({ limit: 50 })`; test `172.20.0.1` in `geo.ts`. | All 5 `click` events returned; 0 `heartbeat` events returned by default; `172.20.0.1` treated as private RFC1918 IP. |
| `BUG-15` | Typecheck + Grep | `npm run type-check` and `Select-String` for `dead_click`, `topPages`, `products.json`, `AIPartsAssistant`, `ComingSoon`. | Zero type errors; zero dead references. |
| `SEC-01` | `curl` check | Unauthenticated `GET /api/flags`, `GET /api/restrictions`, `GET /api/analytics?check=status`, and forced `500` on `POST /api/analytics`. | `/api/flags` & `/api/restrictions` -> `401`; `?check=status` omits `databaseError`; `POST 500` omits raw `details`. |
| `SEC-02` | Unit + Env test | Set `NODE_ENV=production` with unset `ADMIN_ANALYTICS_KEY`; test malformed short cookie in `verifySignedSessionToken`; test `action: 'login'`. | `'mmearth@2026'` fails closed; malformed cookie returns `false` without `timingSafeEqual` `RangeError`; `exp` verified in Unix seconds. |
| `SEC-03` | Build + E2E / `curl` | `npm run build` (verify Edge `middleware.ts` bundles with zero `pg`/Node `'crypto'` errors); seed `'V-Test'` and `'v-test'` then run §4.1 migration; call `addRestriction('visitor_id', 'V-Test')` twice & `removeRestriction('V-TEST')`; test `GET /api/internal/restrictions` (no secret vs valid Web Crypto `x-internal-secret`), `GET /api/visitor-status`, `/api/products/search`, `middleware.ts`. | Build succeeds; migration deduplicates & creates `idx_restrictions_value_lower` without `23505`; `addRestriction` (`ON CONFLICT ((LOWER(value)))`) stores `'v-test'` without `42P10`; `removeRestriction` (`LOWER(value) = LOWER($1)`) deletes case-insensitively; `/api/internal/restrictions` returns `401` unauthenticated & `200` for Edge `middleware.ts`; `/api/visitor-status` -> `{ restricted: true }`; search -> `[]`. |
| `SEC-04` | `curl` check | `POST /api/collect` with `Googlebot/2.1` UA, raw encoded `{d}` fallback string, malformed `{bad` JSON, `>64KB` body, and bad `Origin` in prod. | Bot UA -> `204` no insert; valid raw encoded string -> `204`; malformed JSON -> `400`; `>64KB` -> `413`; bad prod `Origin` -> `403`. |
| `SEC-05` | Unit / DOM test | Render `/api/callback` script with `evil.example` vs `https://preview-abc.vercel.app` vs `http://127.0.0.1:3000`. | `evil.example` blocked; `window.opener.postMessage` fires with explicit origin for trusted/preview origins. |
| `SEC-06` | SQL + `curl` | Send 6 failed logins from same IP, then 1 valid restriction add & 1 flag add. | 6th login -> `429`; `analytics_audit_logs` contains 6 failed logins + `add_restriction` + `add_flag` rows. |
| `BI-01` | API + SQL | Submit `Contact` form with mocked StaticForms `500` (and unknown `visitorId` absent from DB, then ingest initial session); call `getDashboardStats('1y')`. | Visitor upserted first with `total_sessions = 0` (no `23503`, subsequent session sets `total_sessions = 1` not `2`), HTTP `201`, row in `analytics_leads` (`delivery_status = 'fallback_sent' \| 'failed'`), and `1y` returns `YYYY-MM` series + `persistedFormSubmissions`. |
| `BI-02` | Playwright + SQL | Click all 18 canonical `data-placement` CTAs (`floating_whatsapp`..`not_found_wa`); call `getDashboardStats`. | `analytics_events.metadata->>'placement'` matches canonical strings; `placementAttribution` (joining `analytics_visitors v`) returns clicks & lead counts per placement without `42P01`. |
| `BI-03` | Playwright + SQL | Perform searches via mouse click (rank 2), keyboard `ArrowDown+Enter` (rank 1), and zero-result -> WhatsApp click. | `search` events record `searchSurface`/`zeroResults`, while `click` (`metadata->>'action' = 'search_modal_select_product'`) records `resultRank`/`selectionMethod`; `searchFunnelStats` reports Rank CTR, keyboard ratio, & recovery rate. |
| `BI-04` | Playwright + SQL | Visit imageless SKU `/products/loader/...` and `/products?category=excavator`, click `placeholder_photo_wa` & `excavator_banner_wa`. | `placeholder_impression` (`hasImage: false`) & clicks persisted; `catalogHealthGaps` surfaces missing-photo & Excavator demand. |
| `BI-05` | Playwright + SQL | Open `ProductImageZoom` lightbox, toggle `Product Details` `<details>`, click `product_specs_machine_model_link`, click `Similar Products` card, then click `Enquire Now`. | `image_zoom`, `spec_toggle`, `click` (`trackLabel = 'product_specs_machine_model_link'`), and `related_product_click` (via `setupAutoClickTracking`) saved; `productEngagementStats` attributes downstream enquiry to recommendation. |
| `BI-06` | Playwright + SQL | Focus `Contact` field, blur invalid `contact-info`, close `TargetedAssistanceModal` before submit, and mock `500`. | `form_start`, `form_validation_error`, `form_abandon`, `form_submit_error` persisted; `formFunnelStats` renders drop-off funnel in `SearchDwellTab`. |
| `BI-07` | Playwright + SQL | Mock `ipapi.co` returning `{ country_name: 'Nepal', country_code: 'NP' }`; render `ExportInfo` and click `Get Export Quote`. | `export_banner_view` (`NP`) + `export_banner_wa` saved; `AudienceGeoTab` renders export corridor table & server-vs-client geo comparison. |
| `BI-08` | Playwright + SQL | Visit `/models/hm-2021`, expand FAQ `<details>`, click sibling model card, then view a compatible part. | `model_faq_accordion_toggle` (`open: true`) & `model_sibling_switcher_card` (via `setupAutoClickTracking` with `sourceMachineSlug`/`targetMachineSlug`) recorded; `SearchDwellTab` renders `modelHubStats` for all 10 hubs. |
| `BI-09` | SQL + UI | Seed Day 1 non-converting session + Day 2 converting session for 1 visitor; open `VisitorsTab`. | `cohortRetentionStats` reports `total_sessions` distribution (`1`/`2`/`3+`), Day 2+ lift, and first-touch UTM attribution. |
| `BI-10` | Playwright + HTTP | Visit `/admin/analytics` vs `/add-review?src=wa_bill` (followed by a storefront session); inspect `window.dataLayer` and DB. | GA4/Vercel `<TelemetryScripts />` unmounted on `/admin/*`; `/add-review` sets `mm_vid`, upserts `analytics_visitors` (`total_sessions = 0` so subsequent session sets `1`), logs `review_redirect`, and returns 200 redirect HTML. |
| `OBS-01` | API + Unit + SQL | Send valid batch, `413` oversized batch, mocked DB failure (`500`), and offline `localStorage` queue > `48 KB`. | `analytics_ops_metrics` logs `ingest_batch` `ok`/`rejected`/`error`; client splits `mm_retry_queue` into `<= 48 KB` chunks and flushes on reconnect. |
| `OBS-02` | API + SQL | Call `/api/leads`, `/api/products/search`, `/api/analytics`; inspect `analytics_ops_metrics` & `OpsHealthTab`. | `api_request` rows record `duration_ms` and `status_code`; `view: 'ops_health'` returns p50/p95/5xx per route. |
| `OBS-03` | Unit + SQL | Call `getDashboardStats` + `getProducts()` twice on `max: 4` pool; inspect SQL count and `analytics_ops_metrics`. | `getDashboardStats` executes `<= 4` CTE queries; `withOpsMetric` makes 0 recursive calls; `catalog_cache` logs `cache_miss` then `cache_hit`. |
| `OBS-04` | Unit + Playwright + SQL | Mock `ip-api.com` timeout, `StaticForms` 500, and client `ipapi.co` 429 in `useGeoLocation`. | Server `external_call` + client `client_ops` (`target_name = 'ipapi_co'`) recorded in `analytics_ops_metrics` and rendered in `OpsHealthTab`. |
| `OBS-05` | Unit + SQL | Trigger Sentinel alert twice within 60m across simulated cold start (cleared L1 `alertDedupeCache`). | 1st alert `outcome = 'sent'`; 2nd alert `outcome = 'deduplicated'` via `analytics_alert_deliveries`. |
| `OBS-06` | Playwright + SQL | Trigger unhandled JS error, render `app/error.tsx`, and visit `/products/missing-part-999`. | `client_error` & `not_found` events logged in `analytics_events`; `OpsHealthTab` renders 404 URLs and error table. |
| `OBS-07` | Playwright + SQL | Load `/` with mocked fast `onFirstVideoReady` (`400ms`), 12s timeout fallback, and tab hide during splash. | `loading_screen_timing` records `waitDurationMs`, `hitFallback12s`, `bouncedBeforeDismiss`; `OpsHealthTab` displays p50/p95 & bounce rate. |
| `OBS-08` | `curl` + SQL | Request `/products` as DB-restricted visitor/IP via `middleware.ts`. | `307` redirect to `/#contact`; `event.waitUntil` posts to `/api/internal/ops-block`; `analytics_ops_metrics` logs `middleware_block`. |
| `OBS-09` | SQL + UI | Execute login, restriction add/remove, flag add/remove; open `OpsHealthTab`. | `analytics_audit_logs` records every action with `actor_ip` & `metadata`; `view: 'audit_logs'` paginates cleanly. |
| `PROD-01` | E2E + Static grep | Submit `Contact` & `TargetedAssistanceModal` with StaticForms mocked down; grep `components/` for `sf_fd80e723`. | Zero client `accessKey` occurrences; leads saved in DB + StaticForms receives `'contact-info'` & `replyTo: '@'`; fallback alert sent on failure. |
| `PROD-02` | Playwright + Grep | Inspect all 4 imageless product surfaces (`/products`, `/models/[slug]`, product detail hero, similar products). | All render `ProductPlaceholderImage`; WhatsApp CTA carries `data-placement="placeholder_photo_wa"` and triggers `placeholder_impression`. |
| `PROD-03` | Playwright | Open `SearchDwellTab` Zero-Result Searches & `ProductDemandTab` Cold/Imageless rows; click `"Create in CMS"`. | Deep-links navigate to `/admin/#/collections/products/new`; Excavator demand summary card visible. |
| `PROD-04` | Playwright / Lighthouse | Measure `/` interaction-ready time after `PROD-04` rollout. | `LoadingScreen` dismisses in `<= 1.5s` (cap `2.5s`) with video `poster` visible and non-blocking hero. |
| `PROD-05` | Build + E2E | `npm run build` + test restricted IP/visitor on `/`, `/products`, `/models`, `GlobalSearchModal`, `/api/products/search`, `/api/analytics`. | Edge build passes without `pg`; all surfaces respect DB restriction via `/api/visitor-status` & `/api/internal/restrictions` with zero blocklist leak. |
| `PROD-06` | `curl` + Build | Verify production env checks (`ADMIN_ANALYTICS_KEY`, `STATICFORMS_ACCESS_KEY`, `INDEXNOW_KEY`, `EXEMPT_TEST_CONTACTS`, `INTERNAL_API_SECRET`) and OAuth callback origin guard. | Zero hardcoded prod secrets in `lib/` or `app/api/`; all auth/CORS/rate-limit checks pass. |
| `PROD-07` | Build + Grep | `npm run type-check && npm run lint && npm run build` + verify removed dead files/props and consolidated `/api/collect`. | Clean build; `products.json`, `AIPartsAssistant.tsx`, `ComingSoon.tsx`, `onProductEnquire`, `filterAvailability` removed; `/api/collect` uses `ingestTelemetryRequest`. |
| `PROD-08` | Build + Playwright | Inspect `app/admin/analytics/_components/*`; switch to `visitors` tab and hide browser tab for 20s. | `page.tsx` modularized (~250 lines); hidden tab fires 0 polls; `visitors` tab skips `view: 'catalog'` and paginates >250 visitors. |
| `PROD-09` | Playwright | Navigate to `Ops & Audit` tab in `/admin/analytics` and inspect Ops tables (confirming no CRM tab). | `OpsHealthTab` renders all 9 `OBS-*` sections without console/TS errors; zero CRM UI elements rendered. |
| `PROD-10` | Playwright + HTTP | Verify `/admin/*` excludes GA4/Vercel scripts, storefront emits `gtag` events (`generate_lead`, `view_item`, `search`, `select_item`), and `/add-review?src=qr` logs & redirects. | Zero GA4 hits on `/admin/*`; `window.dataLayer` populated on storefront; `/add-review` logs `review_redirect` and redirects to Google Reviews. |

---

## 6. Part 5 — Prioritized Rollout Roadmap (P0–P3)

| Phase | Scope & IDs | Dependencies | Verification Gate & Rollback Strategy |
|---|---|---|---|
| **Phase 0 (P0): Security, Schema & Core Metric Accuracy — DONE (`0b82465`)** | `BUG-12` (DDL reconciliation + `BUG-01` backfill), `BUG-01..03`, `BUG-04`, `BUG-06`, `BUG-08`, `BUG-10`, `SEC-01`, `SEC-02`, `SEC-03`, `SEC-05`, `PROD-05`, `PROD-06` | Idempotent `init_analytics_db.js` executed against PostgreSQL 17.11; `ADMIN_ANALYTICS_KEY` required in production Vercel env (`INTERNAL_API_SECRET` optional via HMAC fallback). | Verified `npm run type-check`, `npm run lint`, `npm run build`, `nuisance-flagging.test.mjs` (`15/15`), `p0-release.test.mjs` (`6/6`), and `tests/e2e/runner.mjs` (`36/36`). |
| **Phase 1 (P1): 1-Year Usage Attribution, Funnel Signals & Reliability (No CRM)** | `BI-01` (enquiry attribution + `90d`/`1y` monthly series, no CRM), `BI-02`, `BI-03`, `BI-06`, `PROD-01` (form proxy + immutable backup log + failover), `OBS-03` (consolidated CTEs + `getProducts()` cache), `OBS-09`, `BUG-05`, `BUG-07`, `BUG-09`, `BUG-11`, `BUG-14`, `SEC-04`, `SEC-06` | `analytics_leads`, `analytics_ops_metrics`, and `analytics_audit_logs` tables already created in P0 DDL. For `PROD-01` StaticForms proxy, either set `STATICFORMS_ACCESS_KEY` in env or use server-side key constant until env update. | Verify all 18 `data-placement` CTAs, search rank/recovery & form funnel events persist cleanly, `1y` `YYYY-MM` series renders, `POST /api/leads` backs up failed StaticForms calls, and `getDashboardStats` runs `<= 4` CTE queries. **Rollback:** Keep `Contact.tsx` StaticForms proxy toggleable cleanly. |
| **Phase 2 (P2): Deep Product Behavior, Client Telemetry & Dashboard Modularization** | `BI-04`, `BI-05`, `BI-07`, `BI-08`, `BI-09`, `OBS-01`, `OBS-02`, `OBS-04`, `OBS-05`, `OBS-06`, `OBS-07`, `OBS-08`, `PROD-02`, `PROD-04`, `PROD-08`, `PROD-09` (`OpsHealthTab` only), `BUG-13` | `analytics_ops_metrics` & `analytics_alert_deliveries` tables. Deploy `OBS-07` splash timing telemetry *before* shortening `LoadingScreen` (`PROD-04`) to measure before/after impact. | Confirm `analytics_alert_deliveries` deduplicates across cold starts, `OpsHealthTab` renders p95/error budgets, and hidden dashboard tabs stop 15s polling. **Rollback:** Keep legacy `LoadingScreen` timeout configurable via constant/env. |
| **Phase 3 (P3): GA4/Review Loop & Catalog Hygiene** | `BI-10`, `PROD-03`, `PROD-07`, `PROD-10`, `BUG-15` | Phase 1–2 instrumentation live. | Verify `window.dataLayer` receives `generate_lead`/`view_item`/`search`, `/add-review` logs `review_redirect`, and `npm run build` succeeds after removing dead files (`products.json`, `AIPartsAssistant`, `ComingSoon`). |
