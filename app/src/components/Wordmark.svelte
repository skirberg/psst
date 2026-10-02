<script>
  // psst + the pineapple period. Leans when someone opens a secret (--lean).
  let { size = 30 } = $props();
</script>

<span class="mark" style:font-size="{size}px" aria-label="psst." translate="no">
  <span class="w">psst</span><svg viewBox="0 0 30 46" aria-hidden="true">
    <g fill="#117555"><path d="M15 17C14 10 15 5 15 0c1 5 2 10 0 17z"/><path d="M15 17c-3-5-7-8-12-9 3 4 7 7 12 9z"/><path d="M15 17c3-5 7-8 12-9-3 4-7 7-12 9z"/><path d="M15 17c-2-6-5-10-9-12 1 5 5 9 9 12z"/><path d="M15 17c2-6 5-10 9-12-1 5-5 9-9 12z"/></g>
    <ellipse cx="15" cy="31" rx="11" ry="14" fill="#F37F5F"/>
    <g stroke="#BF4922" stroke-width="1.3" fill="none" opacity=".85"><path d="M6 24l16 16M5 31l12 12M9 19l17 17M15 18l11 11M24 24L8 40M25 31L13 43M21 19L4 36M15 18L4 29"/></g>
  </svg>
</span>

<style>
  .mark { display: inline-flex; align-items: flex-end; font: 400 1em/0.9 var(--display); letter-spacing: -0.02em; color: var(--text); }
  .w { display: inline-block; font-variation-settings: 'XROT' calc(var(--lean, 0) * 10), 'YROT' calc(var(--lean, 0) * -30); transition: font-variation-settings 0.5s cubic-bezier(.3, 1.4, .5, 1); }
  svg { width: 0.36em; height: 0.56em; margin: 0 0 0.02em 0.04em; }
</style>
