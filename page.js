/* XASIS inner pages: media unmask, videos that play in view, before/after slider, words lighting up on scroll. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // media frames open up when they arrive
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .15 });
  $$('.intro-media').forEach(m => reduce ? m.classList.add('in') : io.observe(m));

  // silent loops play only while visible
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: .3 });
  $$('video[data-auto]').forEach(v => vio.observe(v));

  // before / after slider (keyboard works through the range input)
  $$('.ba').forEach(ba => {
    const r = ba.querySelector('input');
    const set = () => { ba.style.setProperty('--split', r.value + '%'); r.setAttribute('aria-valuetext', `${100 - r.value}% after shown`); };
    r.addEventListener('input', set); set();
    if (!reduce) {   // a gentle hint the first time it is seen
      const hint = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return; hint.disconnect();
        let t0 = null; const step = t => { t0 ??= t; const k = Math.min(1, (t - t0) / 1600);
          r.value = 50 + Math.sin(k * Math.PI * 2) * 18 * (1 - k); set(); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }), { threshold: .6 });
      hint.observe(ba);
    }
  });

  // big statement: words light up as it scrolls through the screen
  $$('.words').forEach(el => {
    const parts = el.innerHTML.split(/(<span class="o">.*?<\/span>|\s+)/).filter(Boolean);
    el.innerHTML = parts.map(p => {
      if (/^\s+$/.test(p)) return p;
      const m = p.match(/^<span class="o">(.*?)<\/span>$/);
      if (m) return m[1].split(/\s+/).map(w => `<span class="wd o">${w}</span>`).join(' ');
      return `<span class="wd">${p}</span>`;
    }).join('');
    const ws = $$('.wd', el);
    if (reduce) { ws.forEach(w => w.classList.add('on')); return; }
    const upd = () => {
      const r = el.getBoundingClientRect(), vh = innerHeight;
      const prog = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .45)));
      const n = Math.round(prog * ws.length);
      ws.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  });
})();
