// Radio groups take one Tab stop; arrow keys, Home and End move the choice (WAI-ARIA radio group pattern).
export function radioKeys(e: KeyboardEvent & { currentTarget: EventTarget & HTMLElement }): void {
  const keys: Record<string, number | 'first' | 'last'> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' };
  const k = keys[e.key];
  if (k == null) return;
  const opts = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=radio]')];
  if (!opts.length) return;
  const i = Math.max(0, opts.indexOf(document.activeElement as HTMLElement));
  const n = k === 'first' ? 0 : k === 'last' ? opts.length - 1 : (i + k + opts.length) % opts.length;
  e.preventDefault(); opts[n].focus(); opts[n].click();
}
