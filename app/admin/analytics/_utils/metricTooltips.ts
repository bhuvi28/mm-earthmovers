/**
 * Plain-English explanations shown in tooltips across `/admin/analytics`
 * so non-technical team members can understand every tab, card, and KPI at a glance.
 */

export const TAB_TOOLTIPS = {
  stream: {
    title: 'Live Activity Stream',
    text: 'Watch real-time visitor traffic trends and a live feed of every page open, part search, and WhatsApp or phone enquiry.',
  },
  products: {
    title: 'Products & Enquiries',
    text: 'See which spare parts get the most views and WhatsApp quote requests, spot parts missing photos, and check Excavator demand.',
  },
  audience: {
    title: 'Audience & Geography',
    text: 'See which Indian states, quarry clusters, and export countries visit your catalog, plus how buyers find your website.',
  },
  demand: {
    title: 'Search, Dwell & Sentinel',
    text: 'See exact part numbers buyers searched for (including unstocked gaps), how long they studied specs, and competitor alerts.',
  },
  visitors: {
    title: 'Visitors & Leads',
    text: 'Browse repeat fleet buyers and customers who submitted contact details, with 1-tap WhatsApp follow-up and visit timelines.',
  },
  restrictions: {
    title: 'Access Restrictions',
    text: 'Manage IP addresses or visitor IDs you chose to block from browsing your parts catalog (for example, aggressive scrapers).',
  },
  ops: {
    title: 'System Health & Audit',
    text: 'Check website reliability: broken 404 URLs, browser errors, telemetry speed, alert delivery logs, and admin security actions.',
  },
} as const;

export const HEADER_TOOLTIPS = {
  onlineNow: {
    title: 'Visitors Online Now',
    text: 'Count of unique people actively browsing the website within the last 5 minutes.',
  },
} as const;

export const KPI_TOOLTIPS = {
  uniqueVisitors: {
    title: 'Unique Visitors',
    text: 'How many different phones or computers visited your website in the selected time period.',
  },
  totalViews: {
    title: 'Total Pageviews & Sessions',
    text: 'Total pages opened across your site. One visit (session) can include several page views.',
  },
  whatsappClicks: {
    title: 'WhatsApp Quote Clicks',
    text: 'How many times buyers clicked a WhatsApp button to request a part price or availability.',
  },
  phoneCalls: {
    title: 'Direct Phone Calls',
    text: 'How many times visitors tapped your phone number link to call your sales desk directly.',
  },
  formLeads: {
    title: 'Contact Form Enquiries',
    text: 'Messages submitted through your website enquiry forms. Backups are saved safely even if email delivery delays.',
  },
  avgDwell: {
    title: 'Average Visit Time',
    text: 'Average active time a visitor spent browsing your catalog during a single visit.',
  },
} as const;

export const STREAM_TOOLTIPS = {
  chartClicks: {
    title: 'Total Clicks',
    text: 'Clicks on buttons, product cards, WhatsApp links, and phone numbers in this period. Click card to show/hide line.',
  },
  chartPageviews: {
    title: 'Total Pageviews',
    text: 'Total product, machine hub, and home pages opened in this period. Click card to show/hide line.',
  },
  chartVisitors: {
    title: 'Unique Visitors',
    text: 'Total distinct visitors counted during the selected time window. Click card to show/hide line.',
  },
  chartLeads: {
    title: 'Enquiry Actions',
    text: 'Combined WhatsApp quote clicks, phone call taps, and submitted enquiry forms. Click card to show/hide line.',
  },
  topClicks: {
    title: 'Most Clicked Buttons & Links',
    text: 'Shows which buttons, part links, and enquiry triggers visitors tap most often across the entire site.',
  },
  liveFeed: {
    title: 'Live Activity Feed',
    text: 'Chronological stream of the latest visitor actions. Tap any visitor ID to inspect their full journey.',
  },
  heartbeatToggle: {
    title: '30-Second Open-Tab Pings',
    text: 'Quiet background pings sent every 30 seconds while a visitor keeps your tab open, used to measure true reading time.',
  },
} as const;

export const PRODUCT_TOOLTIPS = {
  totalCatalog: {
    title: 'Total Catalog Parts',
    text: 'Total number of active spare part listings currently published on your website.',
  },
  activeInquiries: {
    title: 'Parts With Enquiries',
    text: 'How many parts received at least one WhatsApp, phone, or quote enquiry click in this time window.',
  },
  highDemand: {
    title: 'High-Demand Parts',
    text: 'Fast-moving parts that received 2 or more buyer enquiry clicks during this period.',
  },
  opportunity: {
    title: 'Missed-Opportunity Parts',
    text: 'Parts that buyers viewed on the website but nobody enquired about yet — good candidates for better photos or specs.',
  },
  coldInventory: {
    title: 'Zero-Enquiry Parts',
    text: 'Catalog parts that received zero WhatsApp or enquiry clicks in this selected time period.',
  },
  demandReport: {
    title: 'Product Enquiry Demand Report',
    text: 'Ranks every catalog item by pageviews, direct enquiry clicks, and conversion percentage. Tap any row to inspect details.',
  },
  ctaPlacement: {
    title: 'Enquiry Button Placements',
    text: 'Shows exactly which button slot on the site (hero banner, product card, sticky WhatsApp, footer, etc.) brings the most leads.',
  },
  catalogHealthGaps: {
    title: 'Missing-Photo & Excavator Gaps',
    text: 'Ranks parts still using the "Coming Soon" placeholder photo by how often buyers actually see them, plus unstocked Excavator demand.',
  },
  imagelessSkus: {
    title: 'Parts Without Photos',
    text: 'Total active products currently showing a placeholder box instead of a warehouse photo.',
  },
  photoImpressions: {
    title: 'Placeholder Views',
    text: 'How many times buyers saw a photo-less product on screen — higher numbers show which part photos to shoot first.',
  },
  photoWaClicks: {
    title: 'Enquiries on Photo-Less Parts',
    text: 'How many times buyers clicked to enquire about a part even without a photo.',
  },
  excavatorViews: {
    title: 'Excavator Page Visits',
    text: 'Visitors checking for Excavator parts even though that category currently has 0 products listed.',
  },
  excavatorSearches: {
    title: 'Excavator Searches',
    text: 'How many times buyers typed "excavator" or excavator terms into search.',
  },
  excavatorBannerWa: {
    title: 'Excavator Banner Quotes',
    text: 'WhatsApp clicks directly from the Excavator notice banner asking your team to source parts.',
  },
  productEngagement: {
    title: 'Photo Zooms & Cross-Sell Lift',
    text: 'Measures whether zooming part photos, opening spec tables, or clicking "Similar Products" leads to WhatsApp enquiries.',
  },
  zoomOpens: {
    title: 'Photo Lightbox Opens',
    text: 'How many times buyers clicked a part photo to enlarge and inspect it closely.',
  },
  avgZoomTime: {
    title: 'Average Photo Study Time',
    text: 'Average seconds buyers kept the zoomed part photo open before closing it.',
  },
  specToggles: {
    title: 'Specification Table Opens',
    text: 'How many times buyers expanded the technical Product Details / specifications section on a part page.',
  },
  modelHubNav: {
    title: 'Machine Hub Badge Clicks',
    text: 'Clicks on machine model compatibility badges or links leading buyers into a machine model hub.',
  },
  relatedClicks: {
    title: 'Similar Products Clicks',
    text: 'How many times buyers clicked recommended "Similar Products" cards at the bottom of a part page.',
  },
  assistedRfqs: {
    title: 'Cross-Sell Assisted RFQs',
    text: 'Enquiries made after clicking a recommended "Similar Products" card in the same visit.',
  },
  topZoomed: {
    title: 'Most Zoomed Parts',
    text: 'Parts whose photos buyers zoom into most often to check dimensions, bolt holes, or visual details.',
  },
  topRelatedTransitions: {
    title: 'Top Similar-Part Journeys',
    text: 'Most common jumps from one part page to a recommended similar part, and how many converted into quotes.',
  },
} as const;

export const AUDIENCE_TOOLTIPS = {
  topMarket: {
    title: 'Top Country Market',
    text: 'Country sending the largest share of your website visitors in the selected timeframe.',
  },
  topHubCity: {
    title: 'Top Buyer City',
    text: 'City generating the highest visitor traffic for your catalog.',
  },
  primaryChannel: {
    title: 'Main Traffic Source',
    text: 'How most buyers arrived at the site (for example, Google Search, direct link, WhatsApp, or social media).',
  },
  mobileShare: {
    title: 'Mobile vs Desktop Share',
    text: 'Percentage of visits coming from mobile phones vs office desktop computers.',
  },
  geoIntelligence: {
    title: 'Buyer Geography & Mining Hubs',
    text: 'Shows which cities, states, countries, and industrial mining or quarry hubs generate actual quote enquiries.',
  },
  industrialClusters: {
    title: 'Industrial Buyer Belts',
    text: 'Groups cities automatically into major Mining, Infrastructure, and OEM/Quarry hubs to show B2B market demand.',
  },
  exportFunnel: {
    title: 'Overseas Export Funnel',
    text: 'Tracks overseas visitors who saw the global shipping banner, clicked WhatsApp, and compares country detection accuracy.',
  },
  exportBannerViews: {
    title: 'Export Banner Shown',
    text: 'Number of times the international shipping banner appeared to non-India visitors.',
  },
  exportWaClicks: {
    title: 'Export Quote Clicks',
    text: 'Overseas buyers who tapped WhatsApp specifically for export pricing or shipping.',
  },
  exportConversion: {
    title: 'Export Conversion Rate',
    text: 'Percentage of overseas export banner views that turned into a WhatsApp quote click.',
  },
  topExportMarkets: {
    title: 'Top Export Country Breakdown',
    text: 'Countries outside India ranked by export banner views, WhatsApp quote clicks, and conversion rate.',
  },
  geoMismatches: {
    title: 'Country Detector Comparison',
    text: 'Checks how often server-side Cloudflare/Vercel geo differs from the browser geo lookup (VPNs or carrier routing).',
  },
  acquisitionChannels: {
    title: 'Acquisition Channels',
    text: 'Groups all incoming visits into easy categories like Google Search, Direct Bookmarks, WhatsApp, and Social Media.',
  },
  topReferrers: {
    title: 'Exact Referring Sites',
    text: 'Actual external domains or UTM marketing links that sent buyers to your site.',
  },
  techEcosystem: {
    title: 'Devices, OS & Browsers',
    text: 'Shows whether field mechanics and buyers use Android phones, iPhones, or Windows PCs to check parts.',
  },
} as const;

export const DEMAND_TOOLTIPS = {
  buyerSearches: {
    title: 'Total Part Searches',
    text: 'Total searches run by buyers across the search bar and catalog pages, split into matched vs missing parts.',
  },
  catalogGapRate: {
    title: 'Catalog Gap Rate (%)',
    text: 'Percentage of buyer searches that returned zero results — these represent parts people want that are missing from your catalog.',
  },
  deepSpecsDwell: {
    title: 'Engaged Buyer Rate (%)',
    text: 'Share of visits lasting more than 1 minute, showing buyers seriously reviewing specs rather than bouncing away.',
  },
  sentinelAlerts: {
    title: 'Unusual Browsing Alerts',
    text: 'Automated suspicious-behavior candidates flagged for review (never auto-blocked without admin approval).',
  },
  searchDemandFinder: {
    title: 'Search Demand & Gap Finder',
    text: 'Lists exact part numbers and keywords buyers typed so you can spot new spare parts worth stocking.',
  },
  searchSurfaces: {
    title: 'Search Result Clicks & Recovery',
    text: 'Shows which search box buyers used, whether they click the top #1 result, and how often zero-result searches still convert via WhatsApp.',
  },
  formFunnel: {
    title: 'Form Completion Funnel',
    text: 'Shows where visitors drop out: starting a form, hitting a validation mistake, closing early, or completing submission.',
  },
  modelHubs: {
    title: 'Machine Model Hub Performance',
    text: 'Measures how well each of the 10 equipment model pages drives buyers to open parts, FAQs, and alternate machine models.',
  },
  faqOpens: {
    title: 'Top Opened Machine FAQs',
    text: 'Questions customers click open most often on machine pages — helps identify what information buyers need.',
  },
  siblingSwitches: {
    title: 'Alternate Machine Switches',
    text: 'Shows when buyers switch from one loader/grader model page to a related model.',
  },
  dwellDistribution: {
    title: 'Reading Depth & Dwell Time',
    text: 'Breaks visits into quick bounces (<10s), fast skims, engaged reading (1–5m), deep spec study (5–15m), or idle open tabs.',
  },
  sentinelPanel: {
    title: 'Competitor & Scraper Sentinel',
    text: 'Flags rapid automated crawling or mass part-number copying for admin review without automatically blocking anyone.',
  },
} as const;

export const VISITORS_TOOLTIPS = {
  distinctVisitors: {
    title: 'Distinct Visitors',
    text: 'Total unique buyer devices recorded in the selected date window.',
  },
  identifiedLeads: {
    title: 'Identified Buyer Contacts',
    text: 'Visitors who shared their name, phone number, or email through an enquiry form.',
  },
  whatsappInquirers: {
    title: 'WhatsApp Quote Inquirers',
    text: 'Visitors who clicked at least one WhatsApp enquiry link to ask about spare parts.',
  },
  repeatFleets: {
    title: 'Repeat Fleet Buyers',
    text: 'Visitors who came back 2 or more times or across multiple days — strong sign of workshops, quarries, or fleet managers.',
  },
  visitorDirectory: {
    title: 'Visitor & Lead Directory',
    text: 'Searchable list of visitors and identified leads with city, repeat session count, and quick journey inspection.',
  },
  cohortRetention: {
    title: 'Repeat Visits & Return-Day Lift',
    text: 'Compares 1-visit browsers against 2-visit and 3+ visit fleet buyers to prove whether returning visitors convert more often.',
  },
  newVisitors: {
    title: 'First-Time Visitors',
    text: 'Visitors with 1 recorded session so far in this time window.',
  },
  returningVisitors: {
    title: 'Returning Visitors',
    text: 'Visitors who returned for 2 or more sessions or came back on a different day.',
  },
  avgSessionsPerVisitor: {
    title: 'Visits per Buyer',
    text: 'Average number of separate browsing visits made by each visitor.',
  },
  returnDayLift: {
    title: 'Return-Day Quote Rate',
    text: 'Shows how much more likely multi-day returning visitors are to request a quote compared with Day-1 first visits.',
  },
  firstTouch: {
    title: 'First-Touch Traffic Source',
    text: 'Shows which original channel first brought repeat buyers to your website before they eventually enquired.',
  },
} as const;

export const RESTRICTIONS_TOOLTIPS = {
  addRule: {
    title: 'Block IP or Visitor ID',
    text: 'Manually block suspected scrapers from browsing product pages and search results, redirecting them to the contact section.',
  },
  activeList: {
    title: 'Active Restriction Rules',
    text: 'Currently blocked IPs and visitor IDs. Removing a rule restores normal catalog access immediately.',
  },
} as const;

export const OPS_TOOLTIPS = {
  overview: {
    title: 'System Health & Admin Audit',
    text: 'Shows whether telemetry, website APIs, database connections, alerts, and page loads are running smoothly.',
  },
  ingestHealth: {
    title: 'Telemetry Saving Rate',
    text: 'Percentage of incoming analytics batches saved cleanly to the database (should stay near 100%).',
  },
  apiRequests: {
    title: 'Website API Traffic & Errors',
    text: 'Total backend API calls handled and how many failed with a server (5xx) error.',
  },
  splashP95: {
    title: 'Opening Splash Wait (95%)',
    text: 'Wait time experienced by 95% of homepage visitors on the opening animation, plus how many left before it finished.',
  },
  edgeBlocks: {
    title: 'Security Blocks Triggered',
    text: 'Times restricted visitors or scrapers were automatically stopped at the edge before viewing product pages.',
  },
  ingestPipeline: {
    title: 'Telemetry Batch Pipeline',
    text: 'Breaks down incoming analytics uploads into saved batches, rejected bad/bot requests, and server errors.',
  },
  apiSla: {
    title: 'API Route Speed (p50 / p95)',
    text: 'Response speed for backend routes: p50 is typical speed; p95 is slow-case speed under load.',
  },
  dbPool: {
    title: 'Database Pool & Product Cache',
    text: 'Shows active database connections (max 4 pooled) and how often product pages loaded fast from memory cache instead of disk.',
  },
  externalSlas: {
    title: 'Third-Party Service Health',
    text: 'Reliability and response times for external tools like enquiry email (StaticForms), geo lookup, and alerts.',
  },
  alertDeliveries: {
    title: 'Alert Delivery & Anti-Spam Log',
    text: 'Tracks phone/email Sentinel notifications sent and duplicates safely skipped within the 60-minute cooldown.',
  },
  notFoundPaths: {
    title: 'Broken Links (404 Pages)',
    text: 'Missing URLs visitors tried opening (for example old links or typos), plus any part numbers guessed from the URL.',
  },
  clientErrors: {
    title: 'Browser JavaScript Errors',
    text: 'Unexpected script errors visitors hit in their browser that could affect page buttons or layouts.',
  },
  loadingScreenTiming: {
    title: 'Homepage Splash Wait Stats',
    text: 'Measures median and 95th-percentile homepage intro wait times, 12-second fallback timeouts, and early exits.',
  },
  edgeBlocksCard: {
    title: 'Blocked Catalog Requests',
    text: 'Counts page redirects (307) and blocked search requests (200 empty) triggered by your manual restriction rules.',
  },
  auditLog: {
    title: 'Admin Security Audit Trail',
    text: 'Permanent record of admin logins, failed passcodes, watchlist flags, and block/unblock changes.',
  },
} as const;

export const DRAWER_TOOLTIPS = {
  partViews: {
    title: 'Product Page Views',
    text: 'Total opens of this specific product page (matching both clean links and campaign links).',
  },
  partEnquiries: {
    title: 'Total Part Enquiries',
    text: 'Combined WhatsApp/quote clicks from this part detail page and from catalog grid cards.',
  },
  partConversion: {
    title: 'View-to-Enquiry Rate',
    text: 'Percentage of detail-page views that resulted in an enquiry click on that page.',
  },
  lastInquiry: {
    title: 'Most Recent Enquiry',
    text: 'How recently a buyer last clicked to enquire about this spare part.',
  },
  merchandising: {
    title: 'Buyer Interaction Signals',
    text: 'How deeply buyers inspected this part (zooming photos, opening specs, clicking similar items, or viewing without a photo).',
  },
  interactionHistory: {
    title: 'Part Activity History',
    text: 'Direct database log of individual visitor actions on this part within the chosen time range.',
  },
  journeyModal: {
    title: 'Visitor Journey Audit',
    text: 'Full day-by-day timeline of every page, search, part copy, and enquiry made by this buyer.',
  },
  ipStitchToggle: {
    title: 'IP Stitch vs Single ID',
    text: 'When enabled, combines visits sharing the same internet IP address even if the visitor cleared browser cookies.',
  },
} as const;
