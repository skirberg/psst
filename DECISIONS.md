# psst. decisions (source of truth)

Updated 2026-10-09. Accepted decisions, candidates and rejections, with the reasons. Newer entries win.

## Objective now
A working, award-level prototype of psst. Miami that a visitor (test case: a friend in Miami Nov 20 to 24, 2026 for John Summit at Kaseya Center, Nov 20 and 21) and a local would actually use instead of Google Maps or Instagram. Live at https://psst.miami, marked noindex and shared by hand.

## Customer and promise
- The user is anyone visiting or curious about Miami, plus locals looking for the non-obvious. Nobody is paying yet.
- The promise: the right move at the right moment. A move is a place, the hour, the weather, and exactly what to do there.
- Why us over the alternatives: timing, taste, events and planning in one place. Google ranks by review volume, social is chaotic, and Places by Raya is paid, global and places-only.

## Accepted
- **Name: psst.** The pineapple is the period (the hospitality symbol). In the new direction it's the mamey "pineapple-sun".
- **Art direction (round 1, 2026-10-02): "Tear Here".** Today's Miami is a short pad of tear-off move stubs on a screen painted the color of Miami's real sky at the chosen hour. Two of three judges picked it (founder and engineer lenses 7.5; jury 6.5 versus Street Print's 7.5). Full record: design/round1-directions-and-judges.json.
- **Grafts from the runners-up:**
  - Sun shade on the hour numerals, driven by real solar position.
  - Text-led die-cut stickers.
  - Fitted flyer titles that never break mid-word.
  - Flyer tear-off tabs that add an event to the trip.
  - Only what's open glows on the map.
  - A lights-on wave at sunset.
  - Sprite traffic with a performance budget.
  - One clock ("at 9:30pm, now 4:42pm").
  - A first-screen rule: one complete move above the tab bar at a real phone viewport.
- **Type:** Tilt Warp (display, 20px and up, sentence case), Recursive (body via CASL; data via MONO), League Gothic (flyer titles only), Tilt Neon (the night hour only, if it loads in the artifact). All OFL, loaded from Google Fonts.
- **Color:** mamey #F37F5F is the only accent and means "now", once per view. Seven sky stops (dawn, morning, noon, afternoon, golden, dusk, night). Text is bay ink #052739 on paper #FEFAF1. Sticker inks are for stickers only.
- **Stack (prototype):** Svelte 5 + Vite, built to one HTML file, with a canvas map from OSM.
- **Stack (production):**
  - SvelteKit.
  - Supabase (Postgres + PostGIS, auth, realtime, storage). It replaces the D1 pick in the playbook, which was wrong: the core query is geo plus time.
  - Personal Vercel account for now (see Hosting, 2026-10-02), never a company team.
- **Data rules:**
  - Every move and event carries sources and a checked date.
  - Weather is labeled forecast or typical.
  - The forecast is fetched at build time and again every morning, and used for at most 4 days past its fetch; after that, typical. Typical (share of wet days) never turns on rain mode.
  - Events carry doors and show times separately when the venue publishes both.
  - Sources are bare URLs, no verifier notes inside them.
  - Traffic is labeled illustrative.
  - No invented prices, dishes or door details.

## Round 3 (2026-10-02, after founder feedback: "too much AI slop text", "templated and boring", "add hotels")
- **Copy rules:**
  - Titles are the place plus the move, 5 words or fewer.
  - Notes are one line of what to do.
  - No narrated counts.
  - No explanatory footers.
  - No all-caps mono labels except times and serials.
  - All 60 moves were rewritten by hand from fact-checked text (data/copy-r3.json).
- **Today is a deck, not a list:**
  - Mood buttons with custom icons.
  - Fling the card to see the next.
  - The psst button shuffles and deals one move.
  - The tear (drag, or press Keep) rips with a jagged edge and flies to Kept.
  - A trip ticket and tonight's flyers sit under the deck so the value shows on the first screen.
- **Living sky:** clouds by day, stars after dark, rain when the forecast says so. All of it stops under reduced motion.
- **Text-led stickers:** each move's own word in Tilt Warp on a die-cut shape. Stock pictograms are gone.
- **Tabs:** Today, Trip, Events, Stay, Kept, each with a custom icon. Stay shows hotels as key fobs on a rack, by price tier.
- **Planner rules:**
  - Strangers start with no trip (decided by Sami, 2026-10-09). The John Summit weekend, with both nights anchored, comes from the preset or the friend's link https://psst.miami/?trip=summit. A copied plan's link carries its own dates and shows.
  - A move whose note names days ("Weekday afternoon", "Friday or Saturday") only goes on those days.
  - What you keep wins any slot it fits (+1 in the planner's score, decided by Sami 2026-10-09). The hard rules still decide fit: open, near its best hour, reachable in time, near the venue before a show. For the John Summit weekend, 11 of the 43 places outside the default plan can fit, and all 11 get in once kept (checked by plan-check.mjs).
  - At most 4 stops a day.
  - Every stop is within 1.5h of its best time.
  - No secret spots in plans.
  - No double dinners.
  - Multi-day events are respected.
  - Travel time and pre-show proximity are checked.
- **Accessibility:**
  - Text color is picked by WCAG contrast. The worst moment across the day is now 4.60:1.
  - Focus token on paper surfaces.
  - inert hidden stub faces.
  - Persistent live region for toasts.
- **Engineering:** the map reuses cached layers while moving. Trip inputs, bonus secrets from codes, and redeemed codes persist.

## Round 4 (2026-10-09, audit of the live site)
Three lenses (visitor experience, is everything still true, platform) audited psst.miami, and a judge spot-checked and ranked the findings. Full record: design/round4-audit.json. All 24 fixes shipped:
- **For the John Summit friend:** Trip keeps both nights and remembers dates, landing time and energy. On show day the trip ticket names the next stop ("Doors 7pm, Kaseya Center"), the show leads Tonight, and Later skips show hours. Kaseya entries carry how to get there, the bag limit and the last train, with a Go link. Doors 7pm and show 8pm are shown separately.
- **Data:** Headache doors 8pm, Phở Nam books weeks ahead, The Cleat best before dusk, Rawayana's third night (Dec 4), AZ.85 Wednesdays, a parked domain and dead sources removed.
- **Truth:** no more week-old forecast shown as today's weather; Events and Kept drop what has already happened.
- **Phone feel:** a vertical swipe on the tear strip or the time track scrolls the page (tear on touch starts from the No. tab); deck buttons stay put card to card; Go opens the phone's own maps app.
- **Platform:** opens with no signal (service worker), first paint before the app script (0.3 s against 1.5 s on slow 4G), the map stops drawing when nothing moves, zero axe violations on every tab, keyboard focus never lost or hidden.
- **Pre-ship review:** three reviewers tried to break the diff and found a blocker the dev server hides: moving the inlined script with a string replace turned every '$$' into '$' (Stay tiers and prices). Fixed with function replacers, and app/scripts/dist-check.mjs now checks the production file itself. Also fixed from that review: the late-night ticket, Later around shows without a published time, plan links held to the date inputs' bounds, the offline page never replaced by a non-HTML response, fonts cached only when they loaded.
- **Sami's calls (2026-10-09):** strangers get a blank trip: the trip card reads "Your trip, Add your dates", Events opens on Tonight, and Stay measures to the first show on your trip, hidden when there is none. Kept opens with "Yours": what you kept, soonest best hour first, with Go and Went; the sticker book stays below it.
- **Later the same day (Sami asked for clustering plus quick wins):** hotel pins on the desktop Stay map merge into numbered badges when they crowd; one tap zooms just far enough to separate them while keeping the whole group on screen; the picked hotel always stands alone and the map flies to it; the price filter narrows the map as well as the rack. The header temperature follows the clock hour. A "Wrong door." 404 page. Security headers (nosniff, referrer policy, permissions policy, frame-ancestors none) and a day of cache for icons and the share image. 44px tap areas on the small pills. www.psst.miami attached with a 308 like the other domains.
- **Decisions made in this round:** "Miami" in the header; a copied plan's link carries its dates and shows, opening them only for someone with no trip of their own; the share image is the phone view on the golden sky with the wordmark; noindex extends to images and icons (X-Robots-Tag) until the experiment ends; the Michelin star marks only real Michelin Keys, with a legend.

## Rejected (do not revive)
- Hotel Piña (metaphor tax).
- Ventanita as the whole product.
- The glass sidebar.
- Pill chips and the stock icon tab bar.
- Blurred text as a "secret".
- Swipe left/right as like/dislike.
- Miami Vice neon or UV palettes.
- Bank Gothic over neon.
- Yellow accents near Bumble's hue (#FFC53D, #FFB01F).
- Four type families.
- Sound on by default.
- Code 128 barcode theater.
- Daily 3:05 secret drops (weekly until there are enough secrets).
- Spanglish as decoration.
- Grain or riso texture as a global overlay.

## Open questions / candidates
- PNG share of the trip strip via the artifact downloads capability.
- A Thursday 3:05 weekend drop.
- Local curators program.
- Production backend.

## Evidence log
- 60 moves and 44 events, all adversarially fact-checked in two passes (data/verify-moves-r1.json, data/verify-r2.json). One event and three moves were dropped.
- 18 hotels verified (data/verify-hotels.json). Prices are Google Hotels totals for Nov 20 to 24, checked Oct 2, with resort fees folded into the nightly figure. Fees moved several hotels up a tier. Esmé lost its Michelin Key listing. Casa Faena was dropped on taste and the Ritz as a chain.
- Final gate (design/round3-gate.json) scored 6.5. Fixed since: share link and ?code= redeem, peek card, sticker overlap, Events default range, Secret mood position, Stay pin to card, trip pins and clamping, Where mask, Later scroll reset, multi-day labels, note day checks, og image and noindex, leftover filler copy, event pins showing the artist surname. Not done: hotel pin clustering.
- Independent review round 2 (design/round2-reviews.json): jury 6.0, product 6.0, engineering 6.5. r0 scored 3 to 3.5.
- The planner is checked with app/scripts/plan-check.mjs (travel time, opening hours, day words in titles, slot fit, pre-show proximity).
- Screens are checked with app/scripts/shots.mjs (fresh page per view; --motion for unreduced captures).

## Distribution and economics (current hypothesis)
- **First audience:** people visiting Miami Nov 20 to Dec 7, 2026, from Sami's network. The test case is the John Summit weekend. Art Basel week (Dec 1 to 6) brings the largest influx of visitors and is the second test.
- **Channel:** group chats. The planner exports a plain-text stay ("Copy the plan for the group chat"), and every plan carries a PINA code that unlocks a secret for whoever receives it. That gives the person receiving it a reason to open psst. The shareable visual is the golden-hour screen.
- **Message:** "Send me your dates. I'll send you the moves." The founder hands it out by hand, not through ads.
- **First experiment (Nov 15 to Dec 7):**
  - Send the link to 20 to 30 visitors.
  - Measure, by hand plus local counts: opened, built a stay, kept 3 or more moves, marked 1 or more "went", came back the next day.
  - **Hypothesis:** a visitor who builds a stay keeps 3 or more moves and goes to at least 1.
  - **If it fails, decide** between better content (taste), a better first screen (activation), or a different audience (locals rather than visitors).
- **Economics:**
  - Free now. Cost is near zero: a static page and baked data. Production on the Supabase free tier is roughly $0 to $25 a month.
  - Revenue options for later, never paid placement in picks: ticket affiliate links on Wall events, sponsored psst. nights with partner venues, a paid concierge tier for groups.
- **What would change this:** visitors don't share → focus on locals and a weekly Thursday drop. Locals don't return → content freshness is the bottleneck, so recruit curators.

## Icons (2026-10-02)
- **Every icon is the wordmark pineapple**, generated by app/scripts/icons.mjs so there is one source.
- **Browser tab:** the die-cut sticker version (cream outline, heavier hatching that survives 16px). The outline keeps it readable on dark tab bars.
- **Home screen:** the same sticker, tilted like the in-app stickers, on the morning sky (#AEE6F4), which matches theme-color and the splash.
- **Android maskable icon:** smaller art so launcher masks never crop it.

## Hosting (2026-10-02)
- **Code:** a private GitHub repo named psst on Sami's personal account, published from GitHub Desktop. Never on a company account.
- **Hosting:** Sami's personal Vercel account, imported from that repo. Never a company team. vercel.json sets install, build and output, so the import needs no settings.
- **Why Vercel for now:** the prototype is one static page, and every push redeploys with a preview URL per branch. Cloudflare Pages would serve it just as well; the choice only matters once there is a backend, and Supabase stays the backend pick then.
- **After the first deploy:** check that og:image in the page source starts with https://. If not, turn on System Environment Variables in the project settings and redeploy.
- **Live (2026-10-02):** https://psst-miami.vercel.app (also psst-omega.vercel.app). Repo: github.com/skirberg/psst, private. Vercel project psst on the personal Hobby team "Sami" (slug skirberg), Root Directory ./, preset Other, auto-deploy on push to main. The same Vercel login also belongs to a company team, so always check the scope says Sami (Hobby) before creating anything.
- **Domain (2026-10-08):** https://psst.miami is the production domain. psst.ooo, www.psst.ooo, psst-miami.vercel.app and psst-omega.vercel.app 308-redirect to it. og:image comes from VERCEL_PROJECT_PRODUCTION_URL at build time, so any domain change needs a redeploy before share cards point at the new host.
- **Analytics (2026-10-08):** Vercel Web Analytics (Pro, no cookies) via `inject()` in app/src/main.js. Custom events: Plan copied (days, copied/manual), Code redeemed (ok/used/bad), Secret unlocked, Move kept, Tab opened (tab, source: tabbar, ticket, flyer, link), and since Oct 9 Trip dates set (nights, via), Event added (trip), Went. These measure the group-chat loop: plans copied, then codes redeemed by friends.
- **Forecast (2026-10-09):** app/scripts/weather-fetch.mjs runs before every build, and .github/workflows/forecast.yml commits a fresh forecast every morning (6:17am Miami), which redeploys the site. Pull in GitHub Desktop before committing, since the repo moves on its own.
- **Offline (2026-10-09):** app/public/sw.js caches the page, fonts and icons so psst opens with no signal. Bump its cache name when the cached file list changes.
- **Visibility:** the URL is public but the page is marked noindex, and vercel.json sends X-Robots-Tag: noindex for every file. Data is public venue information. Fonts are Google Fonts (OFL), so nothing trial-licensed ships.
