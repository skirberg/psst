// End-to-end checks of psst's real flows in headless Chrome, against the dev server (window.__psst is dev only).
// Usage: node scripts/flows-check.mjs [baseUrl]   (default http://localhost:5179/)
// Exits 1 if any check fails. Each check is one line, so a failure says exactly what broke.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const BASE = (process.argv[2] || 'http://localhost:5179/').replace(/\/?$/, '/');
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true };
const DESK = { width: 1440, height: 900, deviceScaleFactor: 1 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? `  (${detail})` : ''}`); };

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
async function open(path = '#today', vp = PHONE, setup) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  await p.setViewport(vp); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  if (setup) await p.evaluateOnNewDocument(setup);
  await p.goto(BASE + path, { waitUntil: 'networkidle0' }); await p.evaluate(() => document.fonts.ready); await sleep(250);
  return { p, ctx, errors };
}
const text = (p, sel) => p.$eval(sel, (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '');
const setNow = (p, date, hour, dow) => p.evaluate((date, hour, dow) => { const a = window.__psst; a.now = { date, hour, dow }; a.scrubTo(hour); }, date, hour, dow);
const tab = async (p, t, desk = false) => { await p.click(`${desk ? '.tabs' : '.tabbar'} [data-tab=${t}]`); await sleep(350); };

try {
  // A stranger: no trip, nothing broken, nothing inaccessible
  {
    const { p, ctx, errors } = await open();
    check('loads with no page errors', !errors.length, errors[0]);
    check('stranger sees "Your trip, Add your dates"', (await text(p, '.tripticket .tt-main')) === 'Your trip Add your dates');
    for (const t of ['today', 'trip', 'wall', 'stay', 'book']) {
      await tab(p, t); if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.map((x) => `${x.id} x${x.nodes.length}`));
      check(`no accessibility violations on ${t}`, !v.length, v.join(', '));
    }
    await tab(p, 'wall');
    check('Events has no "Your trip" range without dates', !(await p.$$eval('.chips button', (e) => e.map((x) => x.innerText))).includes('Your trip'));
    await tab(p, 'trip');
    check('Trip asks for dates', (await text(p, '.trip > .note')).startsWith('Pick your dates'));
    await p.$eval('#trip-start', (e) => { e.value = '2026-11-27'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(250);
    check('picking an arrival sets the leave date 3 days later', (await p.$eval('#trip-end', (e) => e.value)) === '2026-11-30');
    await ctx.close();
  }
  // The friend's link, and links that must be rejected (the summit link only opens before the trip starts)
  if (new Date().toISOString().slice(0, 10) > '2026-11-20') console.log('skip the John Summit link checks: the trip has started');
  else {
    const { p, ctx } = await open('?trip=summit#today');
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('psst.trip.v1') || '{}'));
    check('?trip=summit opens Trip with both John Summit nights', (await p.evaluate(() => location.hash)) === '#trip' && saved.anchors?.length === 2 && saved.start === '2026-11-20');
    await setNow(p, '2026-11-20', 18.75, 5); await tab(p, 'today');
    check('show day ticket at 6:45pm: "Doors 7pm Kaseya Center"', (await text(p, '.tripticket .tt-main')) === 'Doors 7pm Kaseya Center');
    await setNow(p, '2026-11-21', 0.33, 6); await sleep(100);
    check('after midnight the ticket names last night\'s late stop', /^12:30am /.test(await text(p, '.tripticket .tt-main')));
    await setNow(p, '2026-10-12', 12, 1); await sleep(100);
    check('countdown names the show', / to John Summit$/.test(await text(p, '.tripticket .tt-main')));
    // keep a place: the planner pulls it into the trip, and it shows as kept
    await p.evaluate(() => window.__psst.keep('venetian-pool-weekday-opening')); await tab(p, 'trip');
    const lastDay = await p.evaluate(() => [...[...document.querySelectorAll('.day')].at(-1).querySelectorAll('.slot')].map((s) => s.innerText + (s.querySelector('.ripped') ? ' [Kept]' : '')).join(' | '));
    check('a kept place wins a trip slot it fits', /Venetian Pool/.test(lastDay) && /\[Kept\]/.test(lastDay), lastDay.replace(/\s+/g, ' ').slice(0, 80));
    await ctx.close();
    for (const bad of ['2026-10-09_2099-12-31', '2026-13-45_2026-13-46', '2026-02-31_2026-03-02']) {
      const b = await open(`?trip=${bad}#today`);
      check(`bad trip link ${bad} is ignored`, !(await b.p.evaluate(() => localStorage.getItem('psst.trip.v1'))));
      await b.ctx.close();
    }
  }
  // Today: filters, copy, phone touch
  {
    const { p, ctx } = await open();
    await setNow(p, '2026-10-16', 23, 5);
    const secrets = await p.evaluate(async () => { const a = window.__psst; a.mood = 'secret'; await new Promise((r) => setTimeout(r, 30)); const ok = a.pad.every((x) => x.m.secret === 2 || x.m.category === 'speakeasy'); a.mood = 'all'; return ok; });
    check('Secret mood shows only secrets and speakeasies', secrets);
    await p.evaluate(() => { const a = window.__psst; a.mood = 'drink'; a.scrubTo(9); }); await sleep(100);
    check('empty state reads "No bars open at 9am."', (await text(p, '.empty .e1')) === 'No bars open at 9am.');
    await p.evaluate(() => { const a = window.__psst; a.mood = 'all'; a.scrubTo(20); }); await sleep(150);
    const strip = await p.$eval('.stack .tearoff', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width * 0.45, r.top + r.height / 2]; });
    const kept0 = await p.evaluate(() => window.__psst.kept.length);
    await p.touchscreen.touchStart(...strip); for (let i = 1; i <= 10; i++) { await p.touchscreen.touchMove(strip[0], strip[1] - i * 25); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(300);
    check('a vertical swipe on the tear strip does not keep the card', (await p.evaluate(() => window.__psst.kept.length)) === kept0);
    await p.evaluate(() => document.querySelector('main.col').scrollTo(0, 0)); await sleep(150);
    const tr = await p.$eval('.track', (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width * 0.2, r.top + r.height / 2]; });
    const h0 = await p.evaluate(() => window.__psst.hour);
    await p.touchscreen.touchStart(...tr); for (let i = 1; i <= 10; i++) { await p.touchscreen.touchMove(tr[0] + 2, tr[1] - i * 25); await sleep(16); } await p.touchscreen.touchEnd(); await sleep(250);
    check('a vertical swipe on the time track does not change the hour', (await p.evaluate(() => window.__psst.hour)) === h0);
    const inputs = await p.evaluate(() => { window.__psst.setTab('book'); return new Promise((r) => setTimeout(() => r([...document.querySelectorAll('input')].map((i) => parseFloat(getComputedStyle(i).fontSize))), 300)); });
    check('inputs are 16px or larger (no iPhone zoom)', inputs.every((s) => s >= 16), inputs.join(','));
    await ctx.close();
  }
  // Desktop Stay map: clustering, the price filter, and Today afterwards
  {
    const { p, ctx } = await open('#stay', DESK); await sleep(900);
    const badges = await p.$$eval('.cl', (e) => e.length);
    check('crowded hotels cluster into badges', badges > 0, `${badges} badges`);
    await p.evaluate(() => [...document.querySelectorAll('.tiers button')].find((x) => x.innerText === '$$$$').click()); await sleep(900);
    check('the $$$$ filter leaves 4 hotel pins', (await p.$$eval('.pin', (e) => e.length)) === 4);
    await p.evaluate(() => [...document.querySelectorAll('.tiers button')].find((x) => x.innerText === 'Any').click()); await sleep(600);
    await p.click('.fob'); await sleep(700); await tab(p, 'today', true); await sleep(700);
    const vis = await p.evaluate(() => { const ps = [...document.querySelectorAll('.pin')]; return ps.filter((x) => x.style.visibility === 'visible').length / Math.max(1, ps.length); });
    check('Today shows its pins after a hotel was picked', vis > 0.5, `${Math.round(vis * 100)}% visible`);
    await ctx.close();
  }
} catch (e) { check('flows ran to the end', false, e.message); }
finally { await browser.close(); }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} flows ok`);
if (failed) process.exitCode = 1;
