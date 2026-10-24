import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
// TypeScript in <script lang="ts"> is stripped by Vite's esbuild; svelte-check type-checks it.
export default { preprocess: vitePreprocess() };
