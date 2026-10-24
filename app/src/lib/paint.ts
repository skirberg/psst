// Resolves once the browser reports the first contentful paint, so nothing optional (fonts, map data) competes with it.
// Falls back to two frames plus a short wait where paint timing is missing, and never waits more than 3 s.
let done: Promise<void> | null = null;
export function afterFirstPaint(): Promise<void> {
  return (done ??= new Promise<void>((ok) => {
    const finish = (): void => { clearTimeout(cap); setTimeout(ok, 0); };
    const cap = setTimeout(ok, 3000);
    if (performance.getEntriesByName('first-contentful-paint').length) return finish();
    try {
      const po = new PerformanceObserver((list) => { if (list.getEntriesByName('first-contentful-paint').length) { po.disconnect(); finish(); } });
      po.observe({ type: 'paint', buffered: true });
    } catch {
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(finish, 50)));
    }
  }));
}
