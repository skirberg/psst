// What the checks reach for inside the page: the dev-only app hook and axe.
import type { app } from '../src/lib/state.svelte.ts';
declare global {
  interface Window { __psst: typeof app; axe: { run(ctx: Document, o: object): Promise<{ violations: { id: string; nodes: unknown[] }[] }> } }
}
export {};
