# psst. decisions (source of truth)

Updated 2026-10-02. Accepted decisions, candidates and rejections, with the reasons. Newer entries win.

## Objective now
A working, award-level prototype of psst. Miami that a visitor (test case: a friend in Miami Nov 20 to 24, 2026 for John Summit at Kaseya Center, Nov 20 and 21) and a local would actually use instead of Google Maps or Instagram. Delivered as a private link. Not deployed publicly.

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
  - Cloudflare Pages on a personal account, never the company Vercel.
- **Data rules:**
  - Every move and event carries sources and a checked date.
  - Weather is labeled forecast or typical.
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
  - Both John Summit nights are anchored.
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
- Hotel pin clustering on the Stay map.
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

## Hosting (2026-10-02)
- **Code:** a private GitHub repo named psst on Sami's personal account, published from GitHub Desktop. Never on a company account.
- **Hosting:** Sami's personal Vercel account, imported from that repo. Never a company team. vercel.json sets install, build and output, so the import needs no settings.
- **Why Vercel for now:** the prototype is one static page, and every push redeploys with a preview URL per branch. Cloudflare Pages would serve it just as well; the choice only matters once there is a backend, and Supabase stays the backend pick then.
- **Visibility:** the URL is public but the page is marked noindex. Data is public venue information. Fonts are Google Fonts (OFL), so nothing trial-licensed ships.
