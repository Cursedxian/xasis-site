'use strict';

const demoStorageKey = 'xasis-workspace-demo-reviewed';
function readDemoReviewed() {
  try { return sessionStorage.getItem(demoStorageKey) === 'true'; } catch { return false; }
}
function writeDemoReviewed(value) {
  try { sessionStorage.setItem(demoStorageKey, String(value)); } catch { /* The demo works without storage. */ }
}
function updateDemoReview() {
  const reviewed = readDemoReviewed();
  document.querySelectorAll('[data-next-step-title]').forEach(node => {
    node.textContent = reviewed ? 'Brief reviewed in demo' : 'Review your project brief';
  });
  document.querySelectorAll('[data-review]').forEach(node => {
    node.firstChild.textContent = reviewed ? 'Review again ' : 'Review brief ';
  });
}
function closeDemoDialog(dialog) { if (dialog?.open) dialog.close(); }
document.querySelectorAll('[data-review]').forEach(button => {
  button.addEventListener('click', () => document.getElementById('brief-dialog').showModal());
});
document.querySelectorAll('[data-settings]').forEach(button => {
  button.addEventListener('click', () => document.getElementById('settings-dialog').showModal());
});
document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => closeDemoDialog(button.closest('dialog')));
});
document.querySelectorAll('[data-reviewed]').forEach(button => {
  button.addEventListener('click', () => {
    writeDemoReviewed(true);
    updateDemoReview();
    closeDemoDialog(button.closest('dialog'));
    notify('Brief marked reviewed in this demo. No real project has been approved.');
  });
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});

const sampleBrief = [
  'XASIS / ILLUSTRATIVE PROJECT BRIEF',
  'Enquiry follow-up',
  '',
  'SAMPLE INFORMATION ONLY. No real client or project is connected.',
  '',
  'BUSINESS JOB',
  'Keep track of tuition enquiries and the follow-ups staff need to handle.',
  '',
  'STARTING POINT',
  'An enquiry inbox and a shared spreadsheet.',
  '',
  'POSSIBLE BUILD',
  'A shared lead list, draft replies from approved information and visible next actions.',
  '',
  'HUMAN CONTROL',
  'Staff review replies and take over when the system is unsure.',
  '',
  'ACCEPTANCE CHECK',
  'A test enquiry is captured, assigned and followed through without a duplicate or a missing step.',
  '',
  'BEFORE WORK STARTS',
  'Scope, budget, timing, access, pricing and handover are agreed for a real project.'
].join('\n');
const sampleScope = [
  'XASIS / SAMPLE SCOPE AND CHECKS',
  '',
  sampleBrief,
  '',
  'DELIVERY CHECKLIST',
  '[ ] Confirm scope',
  '[ ] Connect tools',
  '[ ] Review representative and edge cases',
  '[ ] Agree handover and ownership',
  '',
  'This file is an illustrative discussion aid.'
].join('\n');
document.querySelectorAll('[data-download]').forEach(button => {
  button.addEventListener('click', () => {
    const scope = button.dataset.download === 'scope';
    downloadText(scope ? 'xasis-sample-scope.txt' : 'xasis-sample-brief.txt', scope ? sampleScope : sampleBrief);
    notify('Sample document ready to save.');
  });
});

const demoTabs = [...document.querySelectorAll('[data-project-tab]')];
function selectDemoTab(name, focus = false) {
  if (!demoTabs.some(tab => tab.dataset.projectTab === name)) name = 'overview';
  demoTabs.forEach(tab => {
    const active = tab.dataset.projectTab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById('project-panel-' + tab.dataset.projectTab).hidden = !active;
    if (active && focus) tab.focus();
  });
  document.querySelectorAll('[data-workspace-nav]').forEach(link => {
    const active = link.dataset.workspaceNav === (name === 'messages' || name === 'files' ? name : 'projects');
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const url = new URL(location.href);
  if (name === 'overview') url.searchParams.delete('tab');
  else url.searchParams.set('tab', name);
  history.replaceState(null, '', url);
}
demoTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectDemoTab(tab.dataset.projectTab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % demoTabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + demoTabs.length) % demoTabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = demoTabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectDemoTab(demoTabs[next].dataset.projectTab, true);
  });
});
if (demoTabs.length) selectDemoTab(new URL(location.href).searchParams.get('tab') || 'overview');
else if (document.querySelector('[data-workspace="overview"]')) document.querySelector('[data-workspace-nav="overview"]').setAttribute('aria-current', 'page');

const demoMessageForm = document.getElementById('demo-message-form');
const demoMessageInput = document.getElementById('demo-message');
demoMessageInput?.addEventListener('input', () => demoMessageInput.setCustomValidity(''));
demoMessageForm?.addEventListener('submit', event => {
  event.preventDefault();
  const text = demoMessageInput.value.trim();
  if (!text) {
    demoMessageInput.setCustomValidity('Add a short demo message.');
    demoMessageInput.reportValidity();
    return;
  }
  const item = element('li');
  item.append(element('strong', '', 'You · demo message'), element('p', '', text));
  document.getElementById('demo-message-list').append(item);
  demoMessageForm.reset();
  demoMessageInput.focus();
  notify('Demo message added locally. Nothing was sent.');
});

document.querySelectorAll('[data-reset-demo]').forEach(button => {
  button.addEventListener('click', () => {
    writeDemoReviewed(false);
    updateDemoReview();
    document.querySelectorAll('.delivery-checklist input').forEach((input, index) => { input.checked = index === 0; });
    document.querySelectorAll('#demo-message-list li:not(:first-child)').forEach(item => item.remove());
    demoMessageForm?.reset();
    const preference = document.getElementById('demo-notifications');
    if (preference) preference.checked = false;
    document.querySelectorAll('dialog').forEach(closeDemoDialog);
    document.querySelectorAll('.project-actions').forEach(details => { details.open = false; });
    notify('Demo reset.');
  });
});

document.getElementById('demo-login')?.addEventListener('submit', event => {
  event.preventDefault();
  location.href = 'workspace.html';
});
const demoPassword = document.getElementById('demo-password');
const demoPasswordToggle = document.getElementById('toggle-demo-password');
demoPasswordToggle?.addEventListener('click', () => {
  const visible = demoPassword.type === 'password';
  demoPassword.type = visible ? 'text' : 'password';
  demoPasswordToggle.setAttribute('aria-pressed', String(visible));
  demoPasswordToggle.setAttribute('aria-label', visible ? 'Hide demo password' : 'Show demo password');
});
document.getElementById('demo-access-help')?.addEventListener('click', () => {
  notify('Use the supplied sample credentials to enter this demo. For client access, contact hello@xasis.app.');
});
updateDemoReview();
