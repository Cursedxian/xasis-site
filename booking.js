/* Free-check booking picker: the next 7 days and a few call times. Picking one fills the form (sent with the free-check request);
   the team confirms the time by email or WhatsApp. Nothing is booked automatically. */
(() => {
  'use strict';
  const box = document.getElementById('book');
  if (!box) return;
  const days = box.querySelector('.bk-days'), slots = box.querySelector('.bk-slots'), pick = box.querySelector('.bk-pick');
  const hidden = document.getElementById('call-time');
  const TIMES = ['10:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM'];
  const fmtDay = d => d.toLocaleDateString('en-SG', { weekday: 'short' });
  const fmtNum = d => d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
  const start = new Date(); start.setHours(0, 0, 0, 0);
  let chosenDay = null, chosen = '';

  for (let i = 1; i <= 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bk-day'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<small>${fmtDay(d)}</small><b>${d.getDate()}</b><span>${d.toLocaleDateString('en-SG', { month: 'short' })}</span>`;
    b.addEventListener('click', () => selectDay(d, b));
    days.appendChild(b);
  }
  function selectDay(d, btn) {
    chosenDay = d;
    days.querySelectorAll('.bk-day').forEach(x => x.setAttribute('aria-pressed', x === btn));
    slots.innerHTML = '';
    TIMES.forEach(t => {
      const s = document.createElement('button');
      s.type = 'button'; s.className = 'bk-slot'; s.textContent = t; s.setAttribute('aria-pressed', 'false');
      s.addEventListener('click', () => selectSlot(t, s));
      slots.appendChild(s);
    });
    slots.classList.add('in');
    set('');
  }
  function selectSlot(t, btn) {
    slots.querySelectorAll('.bk-slot').forEach(x => x.setAttribute('aria-pressed', x === btn));
    set(`${fmtDay(chosenDay)} ${fmtNum(chosenDay)}, ${t}`);
  }
  function set(v) {
    chosen = v; hidden.value = v;
    pick.classList.toggle('on', !!v);
    pick.querySelector('b').textContent = v || 'Pick a day and time';
  }
  // after a successful request, the picker turns into a ticket
  window.xasisBooked = () => {
    if (!chosen) return;
    box.classList.add('booked');
    box.querySelector('.bk-ticket b').textContent = chosen;
  };
  // first day selected by default so the times are visible straight away
  days.querySelector('.bk-day').click();
})();
