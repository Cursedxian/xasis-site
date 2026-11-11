/* XASIS live service demos. Needs GSAP + ScrollTrigger. Each [data-demo] block replays when it scrolls into view. */
(() => {
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const demos = {
  bp(el) {
    const paths = [...el.querySelectorAll('svg *')];
    paths.forEach(pth => { const L = pth.getTotalLength ? pth.getTotalLength() : 800; pth.style.strokeDasharray = L; pth.style.strokeDashoffset = L; });
    const tl = gsap.timeline({ paused: true });
    tl.set(el.querySelector('.shot'), { clipPath: 'inset(0 100% 0 0)' }).set(el.querySelector('.copy'), { opacity: 0, y: 12 })
      .set(el.querySelector('svg'), { opacity: 1 })
      .to(paths, { strokeDashoffset: 0, duration: 1.4, stagger: .12, ease: 'power2.inOut' })
      .to(el.querySelector('.shot'), { clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'power3.inOut' }, '+=.1')
      .to(el.querySelector('svg'), { opacity: 0, duration: .5 }, '<.6')
      .to(el.querySelector('.copy'), { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.3');
    return tl;
  },
  ai(el) {
    const q = el.querySelector('#aiQ'), text = 'Who can build a website for my business in Singapore?';
    const rows = [...el.querySelectorAll('.ai-row')], H = 74;
    const tl = gsap.timeline({ paused: true });
    const o = { n: 0 };
    tl.set(rows, { opacity: 0, y: i => i * H + 14 }).set(q, { textContent: '' })
      .to(o, { n: text.length, duration: 1.6, ease: 'none', onUpdate: () => { q.textContent = text.slice(0, Math.round(o.n)); } })
      .to(rows, { opacity: 1, y: i => i * H, duration: .5, stagger: .18, ease: 'power3.out' }, '+=.2')
      .to(rows[2], { y: 0, duration: .9, ease: 'power3.inOut' }, '+=.5')
      .to(rows.slice(0, 2), { y: i => (i + 1) * H, duration: .9, ease: 'power3.inOut' }, '<')
      .call(() => { rows[2].querySelector('.n').textContent = '1'; rows[0].querySelector('.n').textContent = '2'; rows[1].querySelector('.n').textContent = '3'; })
      .eventCallback('onStart', () => { rows[2].querySelector('.n').textContent = '3'; rows[0].querySelector('.n').textContent = '1'; rows[1].querySelector('.n').textContent = '2'; });
    return tl;
  },
  wa(el) {
    // the whole chat is shown at once (quick pop-in), so nobody has to wait for it
    const m = [...el.querySelectorAll('.msg')], typing = el.querySelector('.typing'), hand = el.querySelector('.handover');
    const show = m.filter(x => x !== typing).concat(hand);
    const tl = gsap.timeline({ paused: true });
    tl.set(typing, { display: 'none' }).set(show, { display: 'block', opacity: 0, y: 8 })
      .to(show, { opacity: 1, y: 0, duration: .35, stagger: .12, ease: 'power3.out' });
    return tl;
  }

};
document.querySelectorAll('[data-demo]').forEach(c => {
  const el = c.querySelector('.demo'), tl = demos[c.dataset.demo](el);
  if (reduce) { tl.progress(1); return; }
  ScrollTrigger.create({ trigger: c, start: 'top 70%', end: 'bottom 20%',
    onEnter: () => tl.restart(), onEnterBack: () => tl.restart() });
});

})();
