# MM Earthmovers — Phase 3 (P3) & Remaining Enhancements Plan

**Date:** November 27, 2026  
**Baseline:** P0 (`0b82465`), P1 (`5e49111`), P2 (`74ffc6a`), & Admin UI Headings/Tooltips (`251aecd`) deployed on `main`.  
**Scope:** Planned **P3** items, **deferred P2 enhancements (`P2-B` & `PROD-02`)**, **privacy/compliance & fairness hardening**, and **explicitly out-of-scope / optional future items**.

---

## Executive Snapshot

| Track | Item IDs / Items | Status | Effort | Requires New Env / DB Changes? |
|---|---|---|---|---|
| **1. Phase 3 (`P3`) Core** | `BI-10`, `PROD-10`, `PROD-03`, `PROD-07`, `BUG-15` | Planned next | Medium (`2–4` days) | Zero DB DDL changes (`analytics_visitors` / `analytics_events` ready); optional GA4 custom event definitions in Google Analytics |
| **2. Deferred P2 Storefront UI (`P2-B` / `PROD-02`)** | `PROD-04`, `PROD-02` | Held for 1–2 wks of P2 baseline data | Small (`1–2` days) | None |
| **3. Privacy, Compliance & Fairness Hardening** | `/privacy`, Consent/GPC, `copy` scoping, HTTPS Geo, Neutral Sentinel & Honest Restrictions | Recommended before Ads / International scale | Medium (`2–3` days) | Optional commercial HTTPS Geo API key if replacing `http://ip-api.com`; env-only `EXEMPT_TEST_CONTACTS` |
| **4. Out-of-Scope / Future Optional** | CRM (`analytics_lead_events`), DB retention auto-prune cron | Excluded by design | Optional | Scheduled job / cron if enabled later |

---

## 1. Phase 3 (`P3`) — Marketing Sync, Review Loop & Catalog Hygiene

### A. For Business & Non-Technical Stakeholders

1. **Tell Google Analytics When Real Leads Happen & Stop Counting Admin Visits (`BI-10`, `PROD-10`)**
   - **Today's gap:** Google Analytics (`G-RHFEC523K9`) and Vercel Analytics run on `/admin/*` pages (diluting traffic numbers with your own team's checks) and do not know when a buyer taps **WhatsApp**, **Phone Call**, or submits a form.
   - **What P3 delivers:** Stops loading Google Analytics on `/admin/*` routes and automatically sends key conversion signals (`generate_lead`, `search`, `view_item`, `select_item`) to Google—improving future Google Ads ROI and Search Console visibility without manual setup.

2. **Track Customer Google Review Link & QR Scans (`BI-10`)**
   - **Today's gap:** `/add-review` redirects customers immediately to your Google Business review page (`g.page/.../review`) without counting how many customers opened the link or whether they came from a WhatsApp follow-up, invoice QR code, or email.
   - **What P3 delivers:** Quietly logs every `/add-review?src=...` visit in analytics before redirecting, and shows review-funnel taps in the **Visitors & Leads** tab.

3. **1-Click "Add Part to Catalog" Shortcuts from Demand Gaps (`PROD-03`)**
   - **What P3 delivers:** Adds direct shortcut links on top **0-Result Search** terms in **Search & Dwell** and on **Cold / Missing-Photo** rows in **Product Demand**, jumping straight to `/admin/#/collections/products/new` (Decap CMS) so adding requested parts takes seconds.

4. **Dead Code & Unused Package Cleanup (`PROD-07`, `BUG-15`)**
   - **What P3 delivers:** Removes leftover unused files, commented UI widgets, and obsolete dashboard fields (`deadClicks` always reading `0`, `public/products.json`, unused AI assistant & ComingSoon components, unused `three` 3D dependency) so the codebase stays fast and easy to maintain.

### B. For Engineering (Exact Technical Scope)

| ID | Target Files | Exact Implementation |
|---|---|---|
| `BI-10` & `PROD-10` (GA4) | [app/layout.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/layout.tsx#L158-L180), new `components/TelemetryScripts.tsx`, new `lib/analytics/ga4.ts` | Move `<Script>` GA4 (`G-RHFEC523K9`) and Vercel `<Analytics />` out of `app/layout.tsx` into `'use client'` `<TelemetryScripts />` checking `!pathname?.startsWith('/admin')`. Add `ga4.ts` helper dual-dispatching `gtag('event', 'generate_lead' \| 'search' \| 'view_item' \| 'select_item')` from `tracker.ts`. |
| `BI-10` (`/add-review`) | [app/add-review/route.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/add-review/route.ts), [stats.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/stats.ts), [VisitorsTab.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/admin/analytics/_components/VisitorsTab.tsx) | Add `export const runtime = 'nodejs'; export const dynamic = 'force-dynamic';` to `/add-review`; read/generate `mm_vid`, upsert `analytics_visitors` (`total_sessions = 0` on insert so session averages stay unskewed), record `review_redirect` (`metadata.source`), set cookie, return redirect HTML to Google Reviews, and surface review stats in `VisitorsTab`. |
| `PROD-03` | [SearchDwellTab.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/admin/analytics/_components/SearchDwellTab.tsx), [ProductDemandTab.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/admin/analytics/_components/ProductDemandTab.tsx) | Add `"Create in CMS"` action links on Zero-Result Searches (`?title=`/`part_number` context) and missing-photo / unstocked Excavator prompts deep-linking to `/admin/#/collections/products/new`. |
| `PROD-07` & `BUG-15` | [lib/analytics/stats.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/stats.ts#L1288), [analytics.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/admin/analytics/_types/analytics.ts#L70), [Contact.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/Contact.tsx#L523), [HomeClient.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/HomeClient.tsx#L312), [ProductsPage.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ProductsPage.tsx#L51), [AIPartsAssistant.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/AIPartsAssistant.tsx), [ComingSoon.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ComingSoon.tsx), `public/products.json`, [package.json](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/package.json#L18-L28) | Delete unused `public/products.json`, `components/AIPartsAssistant.tsx` (commented out in `Contact.tsx:523`), and `components/ComingSoon.tsx`; remove dead `deadClicks` and unused `topPages` from `stats.ts` & `_types/analytics.ts`; remove unused `onProductEnquire` props in `Contact.tsx`/`HomeClient.tsx` and unused `filterAvailability` in `ProductsPage.tsx`; prune unused `three` and `@types/three` from `package.json`. *(Note: `/api/collect` unification was already completed in P1 via `ingestTelemetryRequest`.)* |

---

## 2. Deferred Phase 2 Enhancements (`P2-B` & `PROD-02`)

Both items were intentionally held back during P2 rollout so baseline telemetry could settle first and storefront visuals remained unchanged:

1. **`P2-B` (`PROD-04`) — Faster Opening Splash Screen & Non-Blocking Hero Video**
   - **Current state:** [HomeClient.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/HomeClient.tsx) + [LoadingScreen.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/LoadingScreen.tsx) keep visitors waiting `3,000 ms` minimum and up to `12,000 ms` fallback while `VideoCarousel` buffers, while P2 `OBS-07` telemetry measures wait times and bounces under **Ops & Audit -> LoadingScreen Splash Gate Timing**.
   - **When to ship:** After `1–2` weeks of real visitor data, if **Splash p95** or **Bounced Before Dismiss** confirms buyers leave during the intro gate.
   - **Technical change:** Show a crisp hero video poster frame immediately, unblock first render by capping `LoadingScreen` to `<= 1.5s` (`2.5s` hard cap), and compare post-change bounce rates cleanly against pre-`P2-B` telemetry.

2. **`PROD-02` — Unified Photo-Request Placeholder Card (`ProductPlaceholderImage`)**
   - **Current state:** `16` products without photos keep the dark `"Coming Soon"` UI while `BI-04` tracks `placeholder_impression` silently in [ProductDemandTab.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/app/admin/analytics/_components/ProductDemandTab.tsx) (`Option 2B`). [ProductPlaceholderImage.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/ProductPlaceholderImage.tsx) already exists with a built-in **"Request Real Photos"** WhatsApp button.
   - **When to ship:** Either photograph the top-ranked imageless SKUs from `Catalog Health Gaps`, or swap `"Coming Soon"` across `ProductsPage.tsx`, `ModelProductGrid.tsx`, `ProductImageZoom.tsx`, and `app/products/[category]/[slug]/page.tsx` to `ProductPlaceholderImage` tagged with `data-placement="placeholder_photo_wa"`.

---

## 3. Privacy, Compliance & Fairness Hardening *(Recommended)*

Identified during codebase compliance inspection across tracking, third-party calls, and restriction behavior:

### A. For Business & Non-Technical Stakeholders
1. **Add Privacy Policy, Terms & Form Notice:** Publish a `/privacy` page linked in the footer explaining what visit, form, and location metrics are collected, why they are used, and how a buyer can request deletion.
2. **Add Cookie / Tracking Consent & Respect Browser Privacy Signals:** Load third-party tracking (Google Analytics, Vercel Analytics) only in line with visitor consent preferences and honor browser Global Privacy Control (`GPC`) signals.
3. **Stop Capturing Arbitrary Copied Text:** Restrict clipboard tracking strictly to part-number badges/catalog tokens instead of capturing any general text, phone number, or email highlighted anywhere on a page.
4. **Encrypt Server Geo & Remove Hardcoded Test PII:** Upgrade or remove the unencrypted `http://ip-api.com` fallback lookup, remove fallback developer phone/name strings from source code, use neutral behavior thresholds rather than city targeting, and show restricted visitors a clear trade-enquiry notice instead of silently returning empty search results (`200 []`).

### B. For Engineering (Exact Technical Scope)

| Item | Target Files | Exact Change |
|---|---|---|
| Privacy & Terms Routes | New `app/privacy/page.tsx`, [Footer.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/Footer.tsx), [Contact.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/Contact.tsx), [TargetedAssistanceModal.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/TargetedAssistanceModal.tsx) | Add public `/privacy` disclosure page covering first-party analytics, GA4, geo detection, PostgreSQL form backup (`analytics_leads`), IP storage/retention, and data deletion contact; add short consent notice under form submit buttons. |
| Consent & `GPC` Controls | New `components/ConsentBanner.tsx`, `components/TelemetryScripts.tsx`, [tracker.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/tracker.ts#L283-L394) | Honor `navigator.globalPrivacyControl` / `doNotTrack`, gate GA4 Consent Mode + persistent `mm_vid` cookie persistence on consent choices, and avoid silently re-writing deleted `mm_vid` cookies from `localStorage`. |
| Scope `copy` Tracking | [tracker.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/tracker.ts#L794-L816) | Restrict `document.addEventListener('copy', ...)` to elements inside catalog/part-number containers (`[data-part-number]` / catalog routes excluding `input`/`textarea`) and drop raw non-part free-text capture. |
| HTTPS Geo & Secret Hygiene | [geo.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/geo.ts#L128-L133), [alert.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/alert.ts#L251-L303), [flags.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/analytics/flags.ts#L158-L240) | Remove plaintext `http://ip-api.com` fallback (rely on HTTPS Cloudflare/Vercel headers or HTTPS commercial geo endpoint); mask raw IPs or omit plaintext IPs in external `ntfy.sh`/webhook alerts; remove hardcoded `'9830164610'` / `'bhuvan'` fallbacks in `isBhuvanExempt` (use env vars only); replace city-based `krishnagiri_opera_nuisance` rule with neutral copy/velocity thresholds. |
| Transparent Restriction UX | [middleware.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/middleware.ts), [TargetedAssistanceModal.tsx](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/components/TargetedAssistanceModal.tsx), [restrictions.ts](file:///c:/portfolio/mm-earthmovers-final/mm-earthmovers/lib/restrictions.ts) | Return explicit `403` JSON on restricted `/api/products/search` or render a transparent trade-enquiry gate instead of fake `200 []` empty catalog results + stealth `"Priority Loader Parts Inquiry"` prompt; move static visitor ID out of client-shipped bundle into DB restrictions. |

---

## 4. Permanently Excluded / Optional Long-Horizon Items

- **Sales CRM Pipeline (`analytics_lead_events`):** Intentionally excluded for a lean `1–5` person operation (`analytics_lead_events` stays empty at `0` rows). Revisit only if the team later wants multi-stage quote status tracking (`new` -> `quoted` -> `won`/`lost`), quote value INR, and follow-up SLA workflows inside `/admin/analytics`.
- **Database Retention & IP Pruning Policy (Optional Ops Hygiene):** Add a periodic PostgreSQL cleanup job (for example rotating/nullifying raw `ip_address` after `90–180` days and archiving `analytics_ops_metrics` / raw `analytics_events` older than `12–18` months) once traffic scales.
