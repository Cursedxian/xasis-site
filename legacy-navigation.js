'use strict';
// The retained simulator is a Next.js export. Public-page navigation must use the new static pages.
document.addEventListener('click', event => {
  if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!anchor || anchor.target === '_blank') return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || (url.pathname !== '/' && url.pathname !== '/index.html')) return;
  let target = '/';
  if (url.hash === '#brief') target = '/brief.html';
  else if (url.hash === '#team') target = '/team.html';
  else if (url.hash) target = '/' + url.hash;
  event.preventDefault();
  event.stopImmediatePropagation();
  location.assign(target);
}, true);
