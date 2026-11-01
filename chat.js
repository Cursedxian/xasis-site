// XASIS website assistant: a chat bubble on every page, answered by the XASIS chat function
// (Supabase Edge Function -> Gemini). Replies are shown as plain text only (never HTML).
// The conversation lives in sessionStorage for this tab; XASIS does not store chats.
(() => {
  'use strict';
  const CHAT_URL = 'https://vhulgoboqjmxljhvarur.supabase.co/functions/v1/chat';
  const STORE = 'xasis-chat-v1';
  const WINDOW = 11;
  const MAX_LEN = 500;
  const GREETING = 'Hi! I am the XASIS assistant. Ask me anything about our website, AI search and WhatsApp assistant services for interior design firms.';
  const STARTERS = ['What does XASIS do?', 'How much does it cost?', 'How does the free check work?'];
  const ICON_CHAT = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.2A8 8 0 1 1 20 11.5Z"/></svg>';
  const ICON_CLOSE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
  const ICON_SEND = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>';

  const load = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || '[]');
      return Array.isArray(saved) && saved.length % 2 === 0 ? saved : [];
    } catch { return []; }
  };
  const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(history.slice(-40))); } catch { /* private mode */ } };
  let history = load();
  let busy = false;

  const root = document.createElement('div');
  root.className = 'xc';
  root.innerHTML = `
    <button class="xc-launch" type="button" aria-expanded="false" aria-controls="xc-panel">${ICON_CHAT}<span>Ask XASIS</span></button>
    <section class="xc-panel" id="xc-panel" role="dialog" aria-label="XASIS assistant" hidden>
      <header class="xc-head">
        <div><strong>XASIS assistant</strong><small>AI answers. They can be wrong.</small></div>
        <button class="xc-close" type="button" aria-label="Close chat">${ICON_CLOSE}</button>
      </header>
      <div class="xc-log" role="log" aria-live="polite"></div>
      <div class="xc-starters"></div>
      <form class="xc-form">
        <label class="sr-only" for="xc-input">Your question</label>
        <textarea id="xc-input" rows="1" maxlength="${MAX_LEN}" placeholder="Ask a question" autocomplete="off"></textarea>
        <button class="xc-send" type="submit" aria-label="Send">${ICON_SEND}</button>
      </form>
      <div class="xc-foot">
        <a class="xc-cta" href="/contact.html#project-form">Book a free check</a>
        <p>Please do not share personal details. Messages are processed by Google. <a href="/privacy.html#chat">Privacy</a> <span aria-hidden="true">·</span> <button class="xc-reset" type="button">New chat</button></p>
      </div>
    </section>`;
  document.body.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const launch = $('.xc-launch'), panel = $('#xc-panel'), log = $('.xc-log'), starters = $('.xc-starters');
  const form = $('.xc-form'), input = $('#xc-input'), send = $('.xc-send');

  const bubble = (who, text, extra = '') => {
    const p = document.createElement('p');
    p.className = `xc-msg xc-${who}${extra ? ' ' + extra : ''}`;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  };

  const render = () => {
    log.textContent = '';
    bubble('bot', GREETING);
    history.forEach((m) => bubble(m.role === 'user' ? 'user' : 'bot', m.text));
    starters.textContent = '';
    starters.hidden = history.length > 0;
    STARTERS.forEach((q) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'xc-starter'; b.textContent = q;
      b.addEventListener('click', () => ask(q));
      starters.appendChild(b);
    });
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    launch.setAttribute('aria-expanded', String(open));
    root.classList.toggle('is-open', open);
    if (open) { render(); input.focus(); } else { launch.focus(); }
  };

  const errorText = (status, body) => {
    if (status === 429) return 'You have sent a lot of messages. Please try again in a while, or email hello@xasis.app.';
    if (status === 503 && body && body.error === 'busy') return 'The assistant is busy right now. Please try again later, or book a free check.';
    if (status === 400 && body && body.field === 'message') return 'Please keep your question under 500 characters.';
    return 'Sorry, I could not connect just now. Please try again, or email hello@xasis.app.';
  };

  async function ask(raw) {
    const text = String(raw || '').trim();
    if (!text || busy) return;
    if (text.length > MAX_LEN) { bubble('bot', errorText(400, { field: 'message' }), 'xc-error'); return; }
    busy = true; send.disabled = true; starters.hidden = true;
    input.value = ''; resize();
    bubble('user', text);
    const typing = bubble('bot', 'Typing', 'xc-typing');
    const turn = { role: 'user', text };
    const messages = [...history, turn].slice(-WINDOW).map(({ role, text: t, sig }) => (sig ? { role, text: t, sig } : { role, text: t }));
    let status = 0, body = null;
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      status = res.status;
      body = await res.json().catch(() => null);
    } catch { status = 0; }
    typing.remove();
    if (status === 200 && body && typeof body.reply === 'string' && typeof body.sig === 'string') {
      history.push(turn, { role: 'model', text: body.reply, sig: body.sig });
      save();
      bubble('bot', body.reply);
    } else if (status === 400 && body && body.field === 'history') {
      history = []; save();
      bubble('bot', 'Let us start a fresh chat. Please ask your question again.', 'xc-error');
    } else {
      bubble('bot', errorText(status, body), 'xc-error');
      input.value = text; resize();
    }
    busy = false; send.disabled = false;
    input.focus();
  }

  const resize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 110) + 'px'; };

  launch.addEventListener('click', () => setOpen(panel.hidden));
  $('.xc-close').addEventListener('click', () => setOpen(false));
  $('.xc-reset').addEventListener('click', () => { history = []; save(); render(); input.focus(); });
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener('input', resize);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
  });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
})();
