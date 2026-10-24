# psst. Miami

A city guide built around the right move at the right moment.

## What's here
- `app/`: the app (SvelteKit 2, Svelte 5, Vite 8, strict TypeScript everywhere, static output).
- `data/`: curated, source-checked content. `moves.json` holds the spots, `events.json` the events through Dec 31, 2026. `raw/` holds the OpenStreetMap and weather downloads.
- `playbook/`: the strategy playbook.

## Run it
```
cd app && npm install && node scripts/sync-data.ts && npm run dev
```
Needs Node 24 or later (the scripts are TypeScript and Node runs them directly).
To build: `npm run build` (fetches the forecast, type-checks the app and scripts, builds static files into `build/`, then runs dist-check on them). `npm run preview` serves the build.

## Check it
- `npm run check`: strict TypeScript and Svelte checks on the app and the scripts (zero errors, zero warnings).
- `node scripts/flows-check.ts`: 26 end-to-end flows in Chrome against the dev server, accessibility on every tab included.
- `node scripts/plan-check.ts`, `contrast-check.ts`, `dist-check.ts`, `shots.ts`: planner rules, text contrast across the day, the production build, screenshots.
- `npm test` runs plan-check, contrast-check and the flows (dev server on :5179).
- All of these run on every push in GitHub Actions (`.github/workflows/checks.yml`).

## Data rules
- Every move and event lists the sources that confirm it, and the date it was checked.
- Weather is baked in at build time: a 16-day Open-Meteo forecast, plus 10-year typical values computed from the Open-Meteo archive for later dates. The app labels which one it is showing.
- Sunrise and sunset are calculated, or taken from the forecast when it covers the date.
- The map is OpenStreetMap coastline and major roads (ODbL), simplified by `app/scripts/geo.ts`.

## Stack decisions (prototype vs production)
| Layer | Prototype | Production pick | Why |
|---|---|---|---|
| UI | SvelteKit 2 in strict TypeScript, static (since 2026-10-24) | SvelteKit (TypeScript) | Small runtime for visitors on phones, built-in motion, and every move prerenders as its own page for search. Next.js would also work; the tie-breaker is bundle weight on 4G. |
| Data | JSON in the bundle | Supabase (Postgres + PostGIS) | The core query is "open now, near me, matching filters," which is a geo plus time query that Postgres does natively. Supabase also gives magic-link login, realtime for group plan voting, storage for flyers, and row-level security. D1 was the wrong call in the playbook. |
| Hosting | Vercel (personal account) | Vercel (personal account) | Static page with a preview URL per push. Never a company team. See DECISIONS.md Hosting. |
| Map | Canvas over OSM data | Same approach, or MapLibre + Protomaps for street-level zoom | A custom-drawn map keeps the look ours. |

## Icons
`node app/scripts/icons.ts` regenerates the favicon, the home screen icons and the web manifest from the wordmark pineapple (add `--sheet` for a preview sheet in shots/icons).
