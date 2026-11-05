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
- **Type:** Tilt Warp (display, 20px and up, sentence case), Recursive (body via CASL; data via MONO, the ticket printer), League Gothic (flyer titles only), Tilt Neon (the night hour only, if it loads in the artifact). All OFL, self-hosted from app/static/fonts since 2026-10-24 (scripts/fonts.ts downloads them from Google Fonts; licence in static/fonts/OFL.txt).
- **Color:** mamey #F37F5F is the only accent and means "now", once per view. Seven sky stops (dawn, morning, noon, afternoon, golden, dusk, night). Text is bay ink #052739 on paper #FEFAF1. Sticker inks are for stickers only.
- **Stack (2026-10-24):** SvelteKit 2 (adapter-static) on Svelte 5 and Vite 8, strict TypeScript everywhere, with a canvas map from OSM. One page, prerendered as a shell; the guide runs in the browser (ssr off) because everything on it depends on the visitor's clock.
- **TypeScript (2026-10-24, Sami: "best for everything or nothing"):** the whole app moved from plain JavaScript to strict TypeScript, not a JSDoc half-step. Why: the risk in psst is data shape (60 places, 44 events, 18 hotels with doors, show times and opening windows), most review findings were shape mistakes types catch, the codebase is small enough (about 2,500 lines) to convert properly, and SvelteKit, the production pick, is TypeScript-first. src/lib/types.ts defines every data shape; svelte-check runs with zero errors and zero warnings and gates every build (npm run build runs npm run check), so a type error cannot deploy. The scripts in app/scripts are TypeScript too (2026-10-24): Node 24 runs .ts directly, so there is still no compile step, and tsc checks them with the app's own types (plan-check reads the real planner's types, the flows read the real app state's).
- **SvelteKit (2026-10-24, Sami: "move to sveltekit"):** same single page, now built by SvelteKit 2 with adapter-static. Measured against the old single-file build, both served the same way locally, five Lighthouse runs each (medians):
  - Real 4G throttling: largest paint 1.59 s vs 1.82 s, first paint equal (0.66 s), 107 KB vs 157 KB gzipped up front. Blocking time is slightly higher (267 vs 181 ms) and "interactive" lands later only because the map's coastline now loads after the screen is usable.
  - Lighthouse's simulated estimate (what PageSpeed shows): 99 vs 99, first paint equal.
  - So: equal or a little faster on a cold load, not a big jump. The honest wins are structural: data and fonts off the first screen, typed scripts, a build-time data check, offline that renews itself, and the path to a page per move, server routes and Supabase.
  - How it stays fast (each measured; the first attempts were slower and were changed): code and styles inlined into the page (bundleStrategy 'inline': split files cost an extra round trip on 4G); the map's 166 KB coastline is static/geo.json, fetched after the first paint (pins place from a 4-line frame, src/lib/geo-frame.ts); the four fonts are self-hosted and switched on after the first paint (src/lib/paint.ts), because preloading or inlining them delayed it; the boot screen uses a system face so it fetches nothing.
  - Kit 3 was not used: @vercel/analytics does not support it yet. Revisit when it does.
- **Checks on every push (2026-10-24):** .github/workflows/checks.yml runs the type check (app and scripts), the production build, dist-check, plan-check, contrast-check and flows-check (26 end-to-end flows in Chrome, axe on every tab) on each push to main.
- **Stack (production):**
  - SvelteKit (in place since 2026-10-24).
  - Supabase (Postgres + PostGIS, auth, realtime, storage). It replaces the D1 pick in the playbook, which was wrong: the core query is geo plus time.
  - Personal Vercel account for now (see Hosting, 2026-10-02), never a company team.
- **Data rules:**
  - Every move and event carries sources and a checked date.
  - Weather is labeled forecast or typical.
  - The forecast is fetched at build time and again every morning, and used for at most 4 days past its fetch; after that, typical. Typical (share of wet days) never turns on rain mode.
  - Events carry doors and show times separately when the venue publishes both. As of Oct 9 every concert and club night through Dec 7 has its published doors or start time from the venue or its ticketing page; Fillmore shows publish a start time only, Club Space doors only. Dante's HiFi publishes no weekly hours. Its Tock page (checked Oct 24) confirms Saturday 7pm to 3am and the seatings, now on its card ($25 prepaid for 90 minutes, $50 deposit late night); the other days' windows stay unconfirmed.
  - Every event carries the date it was checked (required since 2026-10-24, enforced by scripts/data-check.ts): 19 were rechecked against venue pages on Oct 9; the other 25 carry Oct 2, the day they were researched with the sources listed on each.
  - Sources are bare URLs, no verifier notes inside them.
  - Traffic is labeled illustrative.
  - No invented prices, dishes or door details.

## Round 3 (2026-10-02, after founder feedback: "too much AI slop text", "templated and boring", "add hotels")
- **Copy rules:**
  - Titles are the place plus the move, 5 words or fewer.
  - Notes are one line of what to do.
  - No narrated counts.
  - No explanatory footers.
  - No all-caps mono labels except times. (Serials removed 2026-11-05.)
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
  - What you keep wins any slot it fits (+1 in the planner's score, decided by Sami 2026-10-09). The hard rules still decide fit: open, near its best hour, reachable in time, near the venue before a show. For the John Summit weekend, 11 of the 43 places outside the default plan can fit, and all 11 get in once kept (checked by plan-check.ts).
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
- **Pre-ship review:** three reviewers tried to break the diff and found a blocker the dev server hides: moving the inlined script with a string replace turned every '$$' into '$' (Stay tiers and prices). Fixed with function replacers, and app/scripts/dist-check now checks the production build itself. Also fixed from that review: the late-night ticket, Later around shows without a published time, plan links held to the date inputs' bounds, the offline page never replaced by a non-HTML response, fonts cached only when they loaded.
- **Sami's calls (2026-10-09):** strangers get a blank trip: the trip card reads "Your trip, Add your dates", Events opens on Tonight, and Stay measures to the first show on your trip, hidden when there is none. Kept opens with "Yours": what you kept, soonest best hour first, with Go and Went; the sticker book stays below it.
- **Later the same day (Sami asked for clustering plus quick wins):** hotel pins on the desktop Stay map merge into numbered badges when they crowd; one tap zooms just far enough to separate them while keeping the whole group on screen; the picked hotel always stands alone and the map flies to it; the price filter narrows the map as well as the rack. The header temperature follows the clock hour. A "Wrong door." 404 page. Security headers (nosniff, referrer policy, permissions policy, frame-ancestors none) and a day of cache for icons and the share image. 44px tap areas on the small pills. www.psst.miami attached with a 308 like the other domains.
- **Decisions made in this round:** "Miami" in the header; a copied plan's link carries its dates and shows, opening them only for someone with no trip of their own; the share image is the phone view on the golden sky with the wordmark; noindex extends to images and icons (X-Robots-Tag) until the experiment ends; the Michelin star marks only real Michelin Keys, with a legend.

## Data upkeep (2026-11-04)
- **Picks stay hand-curated; a robot watches them.** There is no feed for Miami's non-obvious picks: Resident Advisor and DICE have no public API, Eventbrite shut public event search in 2019, and Google Places forbids storing its data or showing it on a non-Google map. Ticketmaster's Discovery API is free (5,000 calls a day) and reports canceled, postponed and rescheduled.
- **Data watch** (app/scripts/data-watch.ts, .github/workflows/data-watch.yml, Monday and Thursday mornings): reads schema.org eventStatus from every upcoming event's own pages, and Ticketmaster when the TICKETMASTER_KEY secret is set. Cancelled or postponed from a structured source sets `status` on the event, the app hides it, and the commit redeploys. A real date or time change, all-dead source links on any place, event or hotel, and anything not re-checked in 45 days go to the GitHub issue "psst data watch", which gets a comment only when something needs a look. With the key it also lists Miami shows psst does not have, for a human to judge. Nothing is added automatically.
- **Events refill themselves (2026-11-04).** Before this, every event ended Dec 31 and Events would have gone empty. app/scripts/events-refresh.ts runs first in the same twice-weekly job and reads the venues' own public calendars: Club Space's events.json (Terrace, The Ground, Floyd, through April 2027) and the WordPress events API of the Miami Beach Bandshell, Ball & Chain and The Bass. It keeps the calendar filled 75 days ahead, at most 30 new events a run. Facts come only from the feed. With the ANTHROPIC_API_KEY secret, Claude (claude-opus-5-5, structured output, default refusal fallback) picks what fits psst and writes the line; without it, a fixed rule keeps Space's Terrace and Ground and the Bandshell (no kids, family, tours, cleanups) with a plain factual line. A feed event that leaves its feed while the feed still covers its date is hidden as cancelled. Events that ended over 30 days ago are dropped. Feed events carry `feed` (name:id). Hand-picked events are never touched by it.
- **What still needs a person:** hotel prices (Google Hotels has no free API), opening hours (Google's terms rule out caching them), new places, and the bills: Vercel Pro, and psst.miami at Name.com through Vercel, registered until 2027-10-09. Auto-renew is set in the Vercel dashboard (Domains), not in the repo.

## Design review (2026-11-05)

Judged against this file and design/round1-directions-and-judges.json (Tear Here), with outside references: Billboard's Club Space oral history (arrive around 5am, sunrise is the moment), Club Space and The Ground's own visitor pages (late-night kitchen; The Ground bans filming and its ticket does not open the Terrace), House Atlas on DICE's time-tiered prices, Apple's Wallet poster tickets (a ticket that is also the guide), NN/g and Material on empty states, Apple and Material type minimums. A first pass applied a generic design skill's house rules and removed the serial and the MONO printer as costume; both are the concept, so both are back. What stands:
- **Events never opens blank.** "Quiet tonight. Next up:" and the next eight shows (Events still opens on Tonight, Sami's call of 2026-10-09).
- **One type scale.** Tokens on .app: 12 (map attribution only), 13, 15, 17, 22, 28, 44, plus display sizes. Nothing read is under 13px; new CSS uses the tokens.
- ~~The serial is a collectible again~~ Superseded the same day by "No ending", below.
- **Send the stub** (round 1's share moment, never built till now): the back of every stub has Send, which draws the stub on the current sky as a 1080x1350 card (src/lib/share.ts) from what the stub shows, including its hour bar, and opens the share sheet, or saves the PNG.
- **Flyers never clip.** A crowded flyer stands taller than 4:5 rather than hide its date or venue (10 were clipped on the live site).
- **The hidden stub face is hidden** (visibility plus inert).
- **Feed events speak psst.** The 30 auto-added events were rewritten by hand in the voice, from feed facts (end times, rooms, ages) and the sources above. Without an API key the refresh writes a plain fact line ("Saturday night till noon Sunday", "separate ticket from the Terrace"), never the venue's own pitch. Space shows held elsewhere (the Adam Port open air on West Flagler, now placed there) are never auto-added; a whole-building night listed twice is added once; races are filler.
- Deliberately not followed from the generic inspector: removing the cream (it is the noon sky), shadows under paper (stubs sit on the sky), monospace and serials (the printer and the collectible), "no photographs" (stickers and flyers are the pictures).

## No ending (2026-11-05, branch `endless`, not pushed)

Sami: "why 011 out of 060 on the move number? ... Maybe no number, and that's the point. Like, there's no ending. That makes you want to use it." And: "There's so much fucking text ... Random numbers, random characters", and that it "doesn't know where someone is at."

- **No numbers on a move.** The serial is gone from the stub, the tear-off, the Kept stamp, the toast ("Kept.") and the Send card. The tear-off keeps the move's ink, a scissors mark (the coupon sign for tear here, and the touch grip), Keep and Go.
- **The pad never runs out.** Everything good right now, then the rest of the day in the order it gets good, then round again. No "1/9". At 9am, Drink deals the next bar with the hour it opens instead of an empty card.
- **No counters anywhere.** Kept shows only what you collected, by neighborhood: no empty slots, no "3/12", no "secrets this week". The trip ticket drops its show and stop counts.
- **Secrets open with a hold, always.** No weekly limit, so no friend codes: the code box, the redeem form and ?code= are gone (old links still open the friend's plan). The plan link carries the dates and shows.
- **Near me.** A pin chip in the header reads "Miami"; tap it and psst asks for your location once, then reads "Near you", deals closest first (distance weighs in, the hour still leads) and puts minutes on every stub ("12 min away", or "6 min walk" under 0.8 km; city driving at about 25 km/h plus 8 minutes to get going and park, so the two meet at 0.8 km). The rest of the day is checked against the right day's hours and the rain at its hour, and psst deals only what is open or opening soon. vercel.json allows geolocation for the site itself (it was off for everyone). The Send card never shows the sender's distance. The Kept tab has no count badge. Outside about 45 km of Miami it says so and keeps the whole city. The coordinates stay in the page: never stored, never sent. Analytics records only a Located event with whether the visitor was in Miami. If location was already allowed, it is used without asking.
- **A move that names its hour leaves at that hour.** Nine titles name a time ("Rubell's 3pm tour", "Sunny's at 5:15", "Tacos María at 1am"). From 15 minutes past that time it is no longer dealt as a move for right now; it comes back in the rest of the day and the next day (`titleHour` and `pastTitleHour` in core.ts). Before this, "Rubell's 3pm tour. Be there by 2:45." was the top card at 3:49pm.
- The header temperature drops the word: "81°" for a forecast, "~81°" for a typical day.

## Places re-checked (2026-11-05)

All 60 places were read against their own pages (and the state park pages), plus search listings where a site cannot be read.
- 56 confirmed and dated 2026-11-05. Changed: Venetian Pool now opens at 10, Tuesday to Sunday, until 4:30 (coralgables.com); Lung Yai dinner runs to 11pm Friday and Saturday (lungyai.com); Cape Florida Lighthouse tours are at 10am and 1pm, Thursday to Monday (floridastateparks.org); The Barnacle is $2 to enter and $3 for the house tour (floridastateparks.org).
- Not confirmed, left as they were with their old dates so the data watch flags them: Casa Rassi (its site lists Monday to Saturday 9am to 5pm, possibly a site default; psst says Tuesday to Saturday 8am to 2pm), Naomi's Garden (only Friday and Saturday hours found), Dante's HiFi (sources disagree), Domino Park (no official hours).
- Notices that need no change: Rubell closes early at 4:30pm on Saturday Nov 7 only; ICA Miami's upper floors are closed for installation; Marc's Bianca has reopened with the same hours; Simpson Park's October closure is over.

## Wireframes, grid and spacing (2026-11-05)

Sami asked whether psst was designed on a wireframe or grid. It was not: 23 different spacing values had been picked by eye. Now:
- **Wireframes:** design/wireframes.html (rendered to design/wireframes.png), the five phone screens as gray boxes. Today is one hero (the hour), one object (the ticket), one action (psst).
- **Phone grid:** 4 columns, 16px margins, 16px gutters. Trip's time takes column 1 and each stop spans columns 2 to 4; Events puts two flyers a row, two columns each; Kept puts four stickers across.
- **Spacing:** every gap, padding and margin is on the 8-point scale (4, 8, 12, 16, 24, 32, 40), plus 1px hairlines. New CSS uses only these.

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
- The planner is checked with app/scripts/plan-check.ts (travel time, opening hours, day words in titles, slot fit, pre-show proximity).
- Screens are checked with app/scripts/shots.ts (fresh page per view; --motion for unreduced captures).

## Distribution and economics (current hypothesis)
- **First audience:** people visiting Miami Nov 20 to Dec 7, 2026, from Sami's network. The test case is the John Summit weekend. Art Basel week (Dec 1 to 6) brings the largest influx of visitors and is the second test.
- **Channel:** group chats. The planner exports a plain-text stay ("Copy the plan for the group chat"), and every plan carries a link that opens the same dates and shows in psst. (Until 2026-11-05 it also carried a PINA code that unlocked a secret; secrets are no longer limited, so the code is gone.) The shareable visual is the golden-hour screen.
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
- **Every icon is the wordmark pineapple**, generated by app/scripts/icons.ts so there is one source.
- **Browser tab:** the die-cut sticker version (cream outline, heavier hatching that survives 16px). The outline keeps it readable on dark tab bars.
- **Home screen:** the same sticker, tilted like the in-app stickers, on the morning sky (#AEE6F4), which matches theme-color and the splash.
- **Android maskable icon:** smaller art so launcher masks never crop it.

## Hosting (2026-10-02)
- **Code:** a private GitHub repo named psst on Sami's personal account, published from GitHub Desktop. Never on a company account.
- **Hosting:** Sami's personal Vercel account, imported from that repo. Never a company team. vercel.json sets install, build and output, so the import needs no settings.
- **Why Vercel for now:** the site is static files, and every push redeploys with a preview URL per branch. Cloudflare Pages would serve it just as well; the choice only matters once there is a backend, and Supabase stays the backend pick then.
- **After the first deploy:** check that og:image in the page source starts with https://. If not, turn on System Environment Variables in the project settings and redeploy.
- **Live (2026-10-02):** https://psst-miami.vercel.app (also psst-omega.vercel.app). Repo: github.com/skirberg/psst, private. Vercel project psst on the personal Hobby team "Sami" (slug skirberg), Root Directory ./, preset Other, auto-deploy on push to main. The same Vercel login also belongs to a company team, so always check the scope says Sami (Hobby) before creating anything.
- **Domain (2026-10-08):** https://psst.miami is the production domain. psst.ooo, www.psst.ooo, psst-miami.vercel.app and psst-omega.vercel.app 308-redirect to it. og:image comes from VERCEL_PROJECT_PRODUCTION_URL at build time, so any domain change needs a redeploy before share cards point at the new host.
- **Analytics (2026-10-08):** Vercel Web Analytics (Pro, no cookies) via `inject()` in app/src/main.js. Custom events: Plan copied (days, copied/manual), Code redeemed (ok/used/bad, retired 2026-11-05), Located (inMiami, from 2026-11-05), Stub sent, Secret unlocked, Move kept, Tab opened (tab, source: tabbar, ticket, flyer, link), and since Oct 9 Trip dates set (nights, via), Event added (trip), Went. These measure the group-chat loop: plans copied, then codes redeemed by friends.
- **Forecast (2026-10-09):** app/scripts/weather-fetch.ts runs before every build, and .github/workflows/forecast.yml commits a fresh forecast every morning (6:17am Miami), which redeploys the site. Pull in GitHub Desktop before committing, since the repo moves on its own. Since 2026-11-04 a local build keeps the committed forecast (only Vercel and GitHub Actions refresh it; WEATHER=1 forces it), because local rewrites of weather.json collided with the morning commit and left the SvelteKit 2 rebuild unpushed for 11 days.
- **Offline (2026-10-09, rebuilt 2026-10-24):** app/src/service-worker.ts precaches the page (code inlined), the map data and the icons on install, and caches fonts as they load, so psst opens with no signal. The cache is named after the build, so every deploy replaces it; nothing to bump by hand. Analytics are never cached.
- **Visibility:** the URL is public but the page is marked noindex, and vercel.json sends X-Robots-Tag: noindex for every file. Data is public venue information. Fonts are Google Fonts (OFL), so nothing trial-licensed ships.
