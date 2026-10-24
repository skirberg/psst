# psst. project rules

- Personal project. Personal GitHub and personal Vercel accounts only, never a company account or team. Never push with the gh CLI or deploy with the Vercel CLI or connector on this machine; publish through GitHub Desktop and the vercel.com dashboard. Vercel scope must be the personal team (slug skirberg, shown as "SK", Pro since 2026-10-08). Live: https://psst.miami
- DECISIONS.md is the source of truth. Update it when a decision changes.
- A GitHub Action commits a fresh forecast every morning, so pull (Fetch origin) in GitHub Desktop before committing or pushing.
- No em dashes or en dashes in copy or docs.
- The app is strict TypeScript: new code is .ts or <script lang="ts">, data shapes live in app/src/lib/types.ts, and `npm run check` must stay at zero errors and zero warnings.
- Check rendered output before calling work done: `npm run check`, `node app/scripts/flows-check.mjs` (dev server running), `shots.mjs`, `plan-check.mjs`, `contrast-check.mjs`, and after `npm run build`, `dist-check.mjs` plus a look at the built page (`npx vite preview`), since the dev server cannot show build-only bugs.
