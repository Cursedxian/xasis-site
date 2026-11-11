/* "Where customers find you": tabs auto-advance while the section is on screen; each screen plays its own little story. */
(() => {
  'use strict';
  const root = document.getElementById('find');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const copies = [...root.querySelectorAll('.find-copy>div')];
  const DUR = 7000;
  let cur = 0, timers = [], cycle = null, visible = false;
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  function play(pane) {
    clear();
    const rows = [...pane.querySelectorAll('.reveal-row')], yous = [...pane.querySelectorAll('.you')];
    const pins = [...pane.querySelectorAll('.pin')], paths = [...pane.querySelectorAll('svg path')], hub = pane.querySelector('.pr-hub');
    rows.forEach(r => r.classList.remove('in')); yous.forEach(y => y.classList.remove('lit'));
    pins.forEach(p => p.classList.remove('in')); paths.forEach(p => p.classList.remove('in')); hub && hub.classList.remove('in');
    if (reduce) { rows.forEach(r => r.classList.add('in')); yous.forEach(y => y.classList.add('lit')); pins.forEach(p => p.classList.add('in')); paths.forEach(p => p.classList.add('in')); hub && hub.classList.add('in'); return; }
    let t = 200;
    const typed = pane.querySelector('.typed');
    if (typed) {
      const q = typed.dataset.q; typed.textContent = '';
      for (let i = 1; i <= q.length; i++) later(() => { typed.textContent = q.slice(0, i); }, t + i * 45);
      t += q.length * 45 + 350;
    }
    pins.filter(p => !p.classList.contains('me')).forEach((p, i) => later(() => p.classList.add('in'), t + i * 120));
    rows.forEach((r, i) => later(() => r.classList.add('in'), t + i * 260));
    const me = pane.querySelector('.pin.me');
    if (me) later(() => me.classList.add('in'), t + 500);
    if (hub) { paths.slice(0, 3).forEach((p, i) => later(() => p.classList.add('in'), t + 700 + i * 200)); later(() => hub.classList.add('in'), t + 1300);
      paths.slice(3).forEach((p, i) => later(() => p.classList.add('in'), t + 1700 + i * 200)); }
    later(() => yous.forEach(y => y.classList.add('lit')), t + rows.length * 260 + 250);
  }
  function show(i, user) {
    cur = (i + tabs.length) % tabs.length;
    tabs.forEach((b, j) => { b.setAttribute('aria-selected', j === cur); b.tabIndex = j === cur ? 0 : -1; });
    const k = tabs[cur].dataset.k;
    copies.forEach(c => c.classList.toggle('on', c.dataset.k === k));
    root.querySelectorAll('.pane').forEach(p => p.classList.toggle('on', p.id === tabs[cur].getAttribute('aria-controls')));
    play(root.querySelector('#' + tabs[cur].getAttribute('aria-controls')));
    // restart the progress bar on the selected tab
    const bar = tabs[cur].querySelector('i'); bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
    clearInterval(cycle);
    if (!reduce && visible) cycle = setInterval(() => show(cur + 1), DUR);
  }
  root.style.setProperty('--dur', DUR / 1000 + 's');
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => { root.classList.add('find-used'); show(i, true); });
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); show(cur + (e.key === 'ArrowRight' ? 1 : -1), true); tabs[cur].focus(); }
    });
  });
  new IntersectionObserver(es => es.forEach(e => {
    const was = visible; visible = e.isIntersecting;
    root.classList.toggle('find-paused', !visible);
    if (visible && !was) show(cur); else if (!visible) clearInterval(cycle);
  }), { threshold: .35 }).observe(root.querySelector('.find-stage'));
  show(0);
})();
