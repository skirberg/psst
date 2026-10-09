// Radio groups take one Tab stop; arrow keys, Home and End move the choice (WAI-ARIA radio group pattern).
export function radioKeys(e) {
  const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' }[e.key];
  if (k == null) return;
  const opts = [...e.currentTarget.querySelectorAll('[role=radio]')];
  if (!opts.length) return;
  const i = Math.max(0, opts.indexOf(document.activeElement));
  const n = k === 'first' ? 0 : k === 'last' ? opts.length - 1 : (i + k + opts.length) % opts.length;
  e.preventDefault(); opts[n].focus(); opts[n].click();
}
