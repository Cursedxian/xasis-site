(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let toastTimer;
  function toast(message) {
    const target = $('.draft-toast');
    target.textContent = message;
    target.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => target.classList.remove('is-visible'), 4500);
  }

  const menu = $('#mobile-menu');
  const opener = $('.menu-toggle');
  function closeMenu() {
    menu.close();
    document.body.classList.remove('menu-open');
    opener.setAttribute('aria-expanded', 'false');
  }
  opener?.addEventListener('click', () => {
    menu.showModal();
    document.body.classList.add('menu-open');
    opener.setAttribute('aria-expanded', 'true');
    $('.menu-close', menu).focus();
  });
  $('.menu-close', menu)?.addEventListener('click', closeMenu);
  menu?.addEventListener('cancel', () => {
    document.body.classList.remove('menu-open');
    opener.setAttribute('aria-expanded', 'false');
  });
  $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));
  matchMedia('(min-width: 901px)').addEventListener('change', e => {
    if (e.matches && menu.open) closeMenu();
  });
  $$('.desktop-nav .dropdown-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const parent = button.closest('.nav-dropdown');
      const open = parent.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.nav-dropdown.is-open').forEach(parent => {
      parent.classList.remove('is-open');
      $('.dropdown-toggle', parent).setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-dropdown')) $$('.nav-dropdown.is-open').forEach(parent => {
      parent.classList.remove('is-open');
      $('.dropdown-toggle', parent).setAttribute('aria-expanded', 'false');
    });
  });

  // The reference uses one static hero. Motion is handled by motion.js.

  $$('.accordion').forEach(group => {
    $$('.accordion-trigger', group).forEach(trigger => {
      trigger.addEventListener('click', () => {
        const selected = trigger.closest('.accordion-item');
        const wasOpen = selected.classList.contains('is-open');
        $$('.accordion-item', group).forEach(item => {
          const open = item === selected && !wasOpen;
          item.classList.toggle('is-open', open);
          $('.accordion-trigger', item).setAttribute('aria-expanded', String(open));
          $('.accordion-panel', item).inert = !open;
        });
      });
    });
  });

  const tabs = $$('[data-service]');
  const tablist = $('.service-tabs');
  function selectService(slug, focus = false) {
    if (!tabs.some(t => t.dataset.service === slug)) return;
    tabs.forEach(tab => {
      const active = tab.dataset.service === slug;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      $(`#panel-${tab.dataset.service}`).hidden = !active;
      if (active && focus) tab.focus({preventScroll: true});
      if (active && window.innerWidth < 1101) {
        tablist.scrollTo({left: tab.offsetLeft - tablist.offsetLeft - 8, behavior: reduced ? 'instant' : 'smooth'});
      }
    });
    document.dispatchEvent(new CustomEvent('xasis:service-change', {detail: {slug}}));
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectService(tab.dataset.service));
    tab.addEventListener('keydown', e => {
      let next;
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) next = (index + 1) % tabs.length;
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) next = (index - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        e.preventDefault();
        selectService(tabs[next].dataset.service, true);
      }
    });
  });
  function syncServiceHash() {
    const slug = location.hash.slice(1);
    selectService(slug);
    if (tabs.length && (tabs.some(t => t.dataset.service === slug))) {
      $('#services').scrollIntoView({behavior: 'instant', block: 'start'});
    }
  }
  if (tabs.length) {
    const orientation = matchMedia('(max-width: 1100px)');
    function setOrientation() { tablist.setAttribute('aria-orientation', orientation.matches ? 'horizontal' : 'vertical'); }
    setOrientation();
    orientation.addEventListener('change', setOrientation);
    syncServiceHash();
    addEventListener('hashchange', syncServiceHash);
  }

  const track = $('.work-track');
  if (track) {
    const shift = direction => {
      const step = $('.project-card', track).getBoundingClientRect().width + parseFloat(getComputedStyle(track).gap);
      track.scrollBy({left: direction * step, behavior: reduced ? 'instant' : 'smooth'});
    };
    $('[data-work-next]').addEventListener('click', () => shift(1));
    $('[data-work-prev]').addEventListener('click', () => shift(-1));
    track.addEventListener('keydown', e => {
      if (e.target !== track) return;
      if (['ArrowRight', 'ArrowLeft'].includes(e.key)) {e.preventDefault(); shift(e.key === 'ArrowRight' ? 1 : -1);}
    });
    let pointer = null;
    track.addEventListener('pointerdown', e => {
      if (e.target.closest('button,a')) return;
      pointer = {id: e.pointerId, x: e.clientX, y: e.clientY, left: track.scrollLeft, dragging: false};
    });
    track.addEventListener('pointermove', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      if (!pointer.dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        pointer.dragging = true;
        track.setPointerCapture(e.pointerId);
        track.style.scrollSnapType = 'none';
      }
      if (pointer.dragging) track.scrollLeft = pointer.left - dx;
    });
    function finishDrag(e) {
      if (!pointer || pointer.id !== e.pointerId) return;
      if (track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
      track.style.scrollSnapType = '';
      pointer = null;
    }
    track.addEventListener('pointerup', finishDrag);
    track.addEventListener('pointercancel', finishDrag);
    track.addEventListener('pointerleave', e => {if (pointer && !pointer.dragging) pointer = null;});
  }

  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    $$('[data-filter]').forEach(b => {
      const active = b === button;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    $$('.work-grid .project-card').forEach(card => card.hidden = filter !== 'All' && card.dataset.category !== filter);
    const count = $$('.work-grid .project-card:not([hidden])').length;
    $('.filter-status').textContent = `${count} concept ${count === 1 ? 'design' : 'designs'} shown`;
    document.dispatchEvent(new CustomEvent('xasis:filter-change'));
  }));

  $$('[data-draft-form]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    $('.form-status', form).textContent = form.classList.contains('newsletter')
      ? 'Thanks, this draft newsletter form is not connected yet.'
      : 'Thanks, this draft form is not connected yet';
  }));
  // Free check form -> XASIS free-check function (Supabase Edge Function). The server re-checks every
  // field, verifies Turnstile and rate-limits; these browser checks are only for convenience.
  const FREE_CHECK_URL = 'https://vhulgoboqjmxljhvarur.supabase.co/functions/v1/free-check';
  const TURNSTILE_SITE_KEY = '0x4AAAAAAFXlJKuBPcyDTJ2Q';
  const SERVICE_NAMES = {"website-upgrade": "Website Upgrade", "ai-search": "AI Search Setup", "assistant": "AI WhatsApp Assistant"};
  const FIELD_LABELS = {name: 'your name', firm: 'your firm name', email: 'your email address', phone: 'your phone or WhatsApp number',
    website_url: 'your website link', google_profile_url: 'your Google Business Profile link', message: 'your message'};
  $$('[data-free-check-form]').forEach(form => {
    const status = $('.form-status', form);
    const submit = $('button[type="submit"]', form);
    const holder = $('[data-turnstile]', form);
    let widgetId = null;
    const renderWidget = () => {
      if (widgetId !== null || !holder || !window.turnstile) return;
      widgetId = window.turnstile.render(holder, {sitekey: TURNSTILE_SITE_KEY, action: 'free-check', theme: 'light'});
    };
    renderWidget();
    const waiter = setInterval(() => { renderWidget(); if (widgetId !== null) clearInterval(waiter); }, 300);
    setTimeout(() => clearInterval(waiter), 20000);
    const resetWidget = () => { try { if (widgetId !== null) window.turnstile.reset(widgetId); } catch { /* widget not loaded */ } };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const token = widgetId !== null && window.turnstile ? window.turnstile.getResponse(widgetId) : '';
      if (!token) { status.textContent = 'Please wait for the security check above the button to finish, then try again.'; return; }
      const data = new FormData(form);
      const value = key => String(data.get(key) || '').trim();
      submit.disabled = true;
      status.textContent = 'Sending...';
      let response = null;
      let result = {};
      try {
        response = await fetch(FREE_CHECK_URL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            name: value('name'), firm: value('firm'), email: value('email'), phone: value('phone'),
            website_url: value('website_url'), google_profile_url: value('google-profile'), message: value('message'),
            service: SERVICE_NAMES[new URLSearchParams(location.search).get('service')] || '',
            website: String(data.get('website') || ''),
            turnstile_token: String(token)
          })
        });
        result = await response.json().catch(() => ({}));
      } catch {
        response = null;
      }
      submit.disabled = false;
      resetWidget();
      if (response && response.ok) {
        form.reset();
        status.textContent = 'Thanks! We got your request. Check your inbox for a confirmation. We reply within 2 working days.';
        return;
      }
      if (!response) status.textContent = 'We could not reach XASIS. Check your connection and try again, or email hello@xasis.app.';
      else if (response.status === 409) status.textContent = 'We already have a request from this email today. We will be in touch soon.';
      else if (response.status === 429) status.textContent = 'Too many requests at once. Please try again in a few minutes.';
      else if (response.status === 400) status.textContent = `Please check ${FIELD_LABELS[result.field] || 'the form'} and try again.`;
      else if (response.status === 403) status.textContent = 'The security check did not pass. Please try again.';
      else status.textContent = 'Something went wrong on our side. Please try again later, or email hello@xasis.app.';
    });
  });

  const requested = new URLSearchParams(location.search).get('service');
  if (requested && $('#message')) {
    const names = {"website-upgrade": "Website Upgrade", "ai-search": "AI Search Setup", "assistant": "AI WhatsApp Assistant"};
    if (names[requested]) $('#message').value = `I would like to learn about ${names[requested]}.`;
  }
  $$('[data-placeholder]').forEach(button => button.addEventListener('click', () => {
    const kind = button.dataset.placeholder;
    const message = kind === 'Sample project' ? 'Design sample with stock photography. Real project details are coming later.'
      : kind === 'Blog article' ? 'Article preview only. The full post is not part of this design draft.'
      : `${kind}: placeholder for this design draft.`;
    toast(message);
  }));

  // One comparison component for the four cards and the work page.
  function initComparison(comparison) {
    const range = $('input[type="range"]', comparison);
    const stage = $('.comparison-stage', comparison);
    const output = $('output', comparison);
    const presets = $$('[data-compare-value]', comparison);
    function update(interacted = false) {
      const value = Math.max(0, Math.min(100, Number(range.value)));
      comparison.style.setProperty('--split', `${value}%`);
      range.setAttribute('aria-valuetext', `${value}% after image shown`);
      if (output) output.textContent = `${value}% After`;
      presets.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.compareValue) === value)));
      if (interacted) comparison.classList.add('has-compared');
    }
    range.addEventListener('input', () => update(true));
    presets.forEach(button => button.addEventListener('click', () => {
      range.value = button.dataset.compareValue;
      update(true);
    }));
    let pointerId = null;
    function move(event) {
      const bounds = stage.getBoundingClientRect();
      range.value = Math.round((event.clientX - bounds.left) / bounds.width * 100);
      update(true);
    }
    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('button')) return;
      event.preventDefault();
      pointerId = event.pointerId;
      stage.setPointerCapture(pointerId);
      range.focus({preventScroll: true});
      move(event);
    });
    stage.addEventListener('pointermove', event => {
      if (event.pointerId === pointerId) move(event);
    });
    function release(event) {
      if (event.pointerId !== pointerId) return;
      if (stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
      pointerId = null;
    }
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    $('.comparison-expand', comparison).addEventListener('click', event => openComparison(comparison, event.currentTarget));
    update();
  }

  let comparisonDialog;
  function openComparison(comparison, opener) {
    if (!comparisonDialog) {
      comparisonDialog = document.createElement('dialog');
      comparisonDialog.className = 'comparison-dialog';
      comparisonDialog.setAttribute('aria-labelledby', 'comparison-dialog-title');
      comparisonDialog.innerHTML = '<div class="comparison-dialog-inner"><div class="comparison-dialog-heading"><h2 id="comparison-dialog-title"></h2><button type="button" class="comparison-close" aria-label="Close comparison">Close <span aria-hidden="true">&times;</span></button></div><div class="comparison-dialog-content"></div><p>Concept images. Before photos are AI-generated to show the idea.</p></div>';
      document.body.append(comparisonDialog);
      $('.comparison-close', comparisonDialog).addEventListener('click', () => comparisonDialog.close());
      comparisonDialog.addEventListener('click', event => {
        if (event.target === comparisonDialog) comparisonDialog.close();
      });
    }
    const placeholder = document.createElement('div');
    placeholder.style.height = `${comparison.getBoundingClientRect().height}px`;
    comparison.before(placeholder);
    const imageSizes = $$('img', comparison).map(img => ({img, sizes: img.sizes}));
    imageSizes.forEach(({img}) => {img.sizes = '(max-width: 1100px) calc(100vw - 56px), 1060px';});
    $('#comparison-dialog-title').textContent = comparison.dataset.title;
    $('.comparison-dialog-content', comparisonDialog).append(comparison);
    comparisonDialog.addEventListener('close', () => {
      placeholder.replaceWith(comparison);
      imageSizes.forEach(({img, sizes}) => {img.sizes = sizes;});
      document.body.classList.remove('comparison-open');
      opener.focus({preventScroll: true});
    }, {once: true});
    document.body.classList.add('comparison-open');
    comparisonDialog.showModal();
    $('.comparison-close', comparisonDialog).focus();
  }
  $$('[data-comparison]').forEach(initComparison);
  // Entry motion is handled by motion.js, with a visible fallback when disabled.
})();
