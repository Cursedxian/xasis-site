/* Free check form -> XASIS free-check function (Supabase Edge Function), same endpoint and fields as the live site.
   The server re-checks every field, verifies Turnstile and rate-limits; these browser checks are only for convenience. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const FREE_CHECK_URL = 'https://vhulgoboqjmxljhvarur.supabase.co/functions/v1/free-check';
  const TURNSTILE_SITE_KEY = '0x4AAAAAAFXlJKuBPcyDTJ2Q';
  const SERVICE_NAMES = { 'website-upgrade': 'Website Upgrade', 'seo-pr': 'SEO + Digital PR', 'assistant': 'AI WhatsApp Assistant' };
  const FIELD_LABELS = { name: 'your name', firm: 'your business name', email: 'your email address', phone: 'your phone or WhatsApp number',
    website_url: 'your website link', google_profile_url: 'your Google Business Profile link', message: 'your message' };
  const form = $('[data-free-check-form]');
  if (!form) return;
  const status = $('.form-status', form), submit = $('button[type="submit"]', form), holder = $('[data-turnstile]', form);
  let widgetId = null;
  const renderWidget = () => {
    if (widgetId !== null || !holder || !window.turnstile) return;
    widgetId = window.turnstile.render(holder, { sitekey: TURNSTILE_SITE_KEY, action: 'free-check', theme: 'light' });
  };
  renderWidget();
  const waiter = setInterval(() => { renderWidget(); if (widgetId !== null) clearInterval(waiter); }, 300);
  setTimeout(() => clearInterval(waiter), 20000);
  const resetWidget = () => { try { if (widgetId !== null) window.turnstile.reset(widgetId); } catch { /* not loaded */ } };

  const requested = new URLSearchParams(location.search).get('service');
  if (SERVICE_NAMES[requested] && $('#message')) $('#message').value = `I would like to learn about ${SERVICE_NAMES[requested]}.`;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const token = widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) : '';
    if (!token) { status.textContent = 'Please wait for the security check above the button to finish, then try again.'; return; }
    const data = new FormData(form);
    const value = k => String(data.get(k) || '').trim();
    submit.disabled = true; status.textContent = 'Sending...';
    let response = null, result = {};
    try {
      response = await fetch(FREE_CHECK_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: value('name'), firm: value('firm'), email: value('email'), phone: value('phone'),
          website_url: value('website_url'), google_profile_url: value('google-profile'),
          message: [value('message'), value('call_time') ? 'Preferred call time: ' + value('call_time') + ' (Singapore)' : ''].filter(Boolean).join(' | '),
          service: SERVICE_NAMES[requested] || '', website: String(data.get('website') || ''), turnstile_token: String(token)
        })
      });
      result = await response.json().catch(() => ({}));
    } catch { response = null; }
    submit.disabled = false; resetWidget();
    if (response && response.ok) { if (window.xasisBooked) window.xasisBooked(); form.reset(); status.textContent = 'Thanks! We got your request. Check your inbox for a confirmation. We reply within 2 working days.'; return; }
    if (!response) status.textContent = 'We could not reach XASIS. Check your connection and try again, or email hello@xasis.app.';
    else if (response.status === 409) status.textContent = 'We already have a request from this email today. We will be in touch soon.';
    else if (response.status === 429) status.textContent = 'Too many requests at once. Please try again in a few minutes.';
    else if (response.status === 400) status.textContent = `Please check ${FIELD_LABELS[result.field] || 'the form'} and try again.`;
    else if (response.status === 403) status.textContent = 'The security check did not pass. Please try again.';
    else status.textContent = 'Something went wrong on our side. Please try again later, or email hello@xasis.app.';
  });
})();
