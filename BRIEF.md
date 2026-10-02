# psst. — creative brief for the redesign round

## The product
psst. is a Miami city guide for anyone visiting or living there. Its job is to hand you the right move at the right moment. A move is a place, the right hour, the weather, and exactly what to do there. The focus is the non-obvious: hidden spots, speakeasies, local institutions, pop-ups, and the week's real events. It should beat Google Maps, TikTok, The Infatuation, and Places by Raya on timing, taste and planning. Locals should open it weekly, and a visitor should be able to plan a trip with it (the test case is a friend visiting Nov 20–24, 2026 for John Summit at Kaseya Center).

Concept sentence (current): "The friend who knows Miami." The name is the sound someone makes right before they tell you something good. The pineapple, a historic symbol of hospitality, is the period in the wordmark.

## The founder's bar
Award-level (Awwwards / FWA Site of the Day). Jaw-dropping, playful, colorful, interactive, fun, engaging, with real taste. Distinctive, never templated, never "AI slop". He has rejected three rounds already: a generic plan, a hotel metaphor that felt like slop, and a playbook page. He calls the current prototype "not good enough".

## What exists now (look at it)
- Screenshots of every screen, desktop 1440x900 and mobile 390x844: /Users/sami/dev/psst/shots/r0/*.png (now-day, now-golden, now-night, plan, wall, you, move, event, receipt).
- Code: /Users/sami/dev/psst/app/src (Svelte 5 + Vite). The key files are App.svelte, components/MiamiMap.svelte (a canvas map drawn from real OSM coastline and roads, with day/night lighting), Dial.svelte (24h sun dial), NowView, PlanView (stay planner with energy curve), WallView (generated riso flyers per event), MoveSheet, Receipt, Sticker (generated sticker per spot), and lib/palette.js and lib/core.js.
- Data: real events in /Users/sami/dev/psst/data/events.json. Real spots are being researched now, so the screenshots show placeholder spots.

## Hard constraints
- Ships as ONE self-contained HTML file (Vite single-file build) inside a sandboxed Claude artifact. Its CSP allows external stylesheets ONLY from Google Fonts. Any other font must be inlined as a base64 @font-face (OFL or other open licenses that allow embedding only). No trial or paid fonts. No external images. No fetch to other hosts at runtime. Canvas, WebGL, WebAudio, SVG and CSS are all fine.
- No photography in the prototype. Venue photos are copyrighted and stock is banned. Visuals must come from type, color, illustration, generated graphics, the map, and motion. Real photos come in a later shoot.
- Everything shown must be real or clearly labeled (weather is a baked forecast plus typical values; sunrise and sunset are calculated).
- It must work on a phone first (most use is mobile, on the street), and must also impress on desktop.
- Respect prefers-reduced-motion. Readable contrast. Keyboard accessible.
- The stack stays Svelte 5 + canvas. Production will be SvelteKit + Supabase, which is not a concern here.

## Known weaknesses (the founder's and ours)
It reads as a "dark map template + glassy sidebar". The pills, list rows and panel are generic. The brand barely shows (the logo is small, the pineapple is tiny). Day mode is bland. There's no hero moment, no texture, and nothing you'd screenshot and send to a friend.
