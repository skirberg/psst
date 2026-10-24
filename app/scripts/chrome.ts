// Shared by the browser checks: headless Chrome, and a Vite server that loads the app's own modules.
import puppeteer, { type Browser } from 'puppeteer-core';
import { createServer, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DEV = 'http://localhost:5179/';
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const chrome = (args: string[] = []): Promise<Browser> =>
  puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args });

/** Load app modules (core.ts, sky.ts) with their JSON, typed as the real module. */
export async function modules(): Promise<{ core: typeof import('../src/lib/core.ts'); sky: typeof import('../src/lib/sky.ts'); server: ViteDevServer }> {
  const server = await createServer({ configFile: false, root: ROOT, logLevel: 'silent', server: { middlewareMode: true } });
  const core = (await server.ssrLoadModule('/src/lib/core.ts')) as typeof import('../src/lib/core.ts');
  const sky = (await server.ssrLoadModule('/src/lib/sky.ts')) as typeof import('../src/lib/sky.ts');
  return { core, sky, server };
}
