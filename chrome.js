/* XASIS shared behaviour: smooth scroll, header, phone menu, reveals, split headings, footer mark, blue band light. */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // smooth scroll (Lenis) driving GSAP ScrollTrigger when present
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.xLenis = lenis;
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -80 }); }
    }));
  }

  // header: solid after a little scroll, hides going down, returns going up
  const head = $('.site-header');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (head) {
      const b = document.body.classList;
      head.classList.toggle('is-solid', y > 40 && !b.contains('hero-dark') && !b.contains('sky'));
      head.classList.toggle('is-hidden', y > 400 && y > lastY + 4 && !head.contains(document.activeElement));
      if (y < lastY - 4) head.classList.remove('is-hidden');
    }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // phone menu (native dialog: Esc closes for free)
  const menu = $('#mobile-menu');
  if (menu) {
    const open = $('.menu-toggle'), close = $('.mm-close');
    open && open.addEventListener('click', () => { menu.showModal(); open.setAttribute('aria-expanded', 'true'); lenis && lenis.stop(); });
    const shut = () => { menu.close(); };
    close && close.addEventListener('click', shut);
    menu.addEventListener('close', () => { open && open.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); });
    $$('a', menu).forEach(a => a.addEventListener('click', shut));
  }

  // split headings into words for a line-by-line rise
  $$('.split').forEach(el => {
    if (el.dataset.done) return; el.dataset.done = 1;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.textContent = part; w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
    $$('.w>span', el).forEach((s, i) => { s.style.transitionDelay = (i * 0.045) + 's'; });
  });

  // reveal on view
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  $$('.rv,.split').forEach(el => reduce ? el.classList.add('in') : io.observe(el));

  // footer wordmark: letters rise one by one
  const mark = $('.foot-mark');
  if (mark && !reduce) {
    const ls = $$('span', mark);
    ls.forEach((l, i) => { l.style.transform = 'translateY(70%)'; l.style.opacity = '0';
      l.style.transition = `transform 1.1s var(--ease) ${i * 0.07}s, opacity .9s ease ${i * 0.07}s`; });
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (e.isIntersecting) { ls.forEach(l => { l.style.transform = 'none'; l.style.opacity = '1'; }); o.disconnect(); }
    }), { threshold: 0.3 }).observe(mark);
  }

  // blue band: the light follows the pointer
  $$('.found').forEach(b => {
    if (reduce) return;
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      b.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });
})();

/* sky colour flow (kept outside the main closure so pages without it still work) */
(() => {
  const stops = [            // [scroll fraction, top colour, bottom colour]
    [0.00, [251, 231, 218], [255, 255, 255]],
    [0.18, [255, 255, 255], [255, 255, 255]],
    [0.36, [241, 245, 255], [234, 240, 255]],
    [0.56, [255, 255, 255], [255, 246, 239]],
    [0.76, [255, 236, 224], [255, 224, 204]],
    [1.00, [232, 226, 251], [214, 220, 255]]
  ];
  const el = document.createElement('div'); el.id = 'skyflow'; el.setAttribute('aria-hidden', 'true');
  document.body.prepend(el);
  const start = () => { const r = document.getElementById('reel'); return r ? r.offsetTop + r.offsetHeight - innerHeight : 0; };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  let s0 = start(), last = -1;
  const upd = () => {
    const max = document.documentElement.scrollHeight - innerHeight - s0;
    const f = Math.min(1, Math.max(0, (scrollY - s0) / Math.max(1, max)));
    if (Math.abs(f - last) < 0.001) return; last = f;
    let i = 0; while (i < stops.length - 2 && f > stops[i + 1][0]) i++;
    const [a, b] = [stops[i], stops[i + 1]], t = (f - a[0]) / (b[0] - a[0]);
    el.style.setProperty('--sf1', rgb(mix(a[1], b[1], t))); el.style.setProperty('--sf2', rgb(mix(a[2], b[2], t)));
  };
  addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', () => { s0 = start(); last = -1; upd(); });
  addEventListener('load', () => { s0 = start(); last = -1; upd(); });
  upd();
})();
