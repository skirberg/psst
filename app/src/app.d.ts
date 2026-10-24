// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
  interface Window { __psst?: unknown } // screenshot and flow harness hook, dev only
}
export {};
