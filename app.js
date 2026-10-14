'use strict';

const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const notice = document.getElementById('notice');
let noticeTimer;

function notify(message) {
  if (!notice) return;
  notice.textContent = message;
  notice.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove('visible'), 4000);
}

function downloadText(filename, content) {
  const objectUrl = URL.createObjectURL(new Blob([content], {type: 'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Shared mobile navigation.
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.main-nav');
function closeMenu() {
  navigation?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  if (menuToggle) menuToggle.querySelector('span').textContent = '+';
}
menuToggle?.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  navigation.classList.toggle('open', !open);
  menuToggle.querySelector('span').textContent = open ? '+' : '−';
});
navigation?.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation?.classList.contains('open')) {
    closeMenu();
    menuToggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.main-nav, .menu-toggle')) closeMenu();
});

// These are illustrative workflows, with no invented client outcomes or metrics.
const solutions = [
  {
    label: 'ENQUIRIES & FOLLOW-UP',
    title: 'Give every enquiry a clear next step.',
    description: 'Bring enquiries into one place, draft useful replies and make follow-ups visible to the person responsible.',
    points: ['A shared list your team can follow', 'Replies grounded in your business information', 'A person takes over when needed'],
    preview: '<div class="preview-bar"><span><i></i> ENQUIRY WORKFLOW</span><span class="sample-badge">ILLUSTRATIVE</span></div><div class="message-card"><div class="message-meta"><span>Incoming enquiry</span><span>New</span></div><p>Do you have weekend classes? How can I arrange a trial?</p></div><div class="workflow-connector"></div><div class="action-card"><span class="action-icon">↗</span><div><strong>Record the enquiry</strong><p>Add an owner and a next action.</p></div></div><div class="workflow-connector"></div><div class="action-card"><span class="action-icon">✓</span><div><strong>Prepare a useful reply</strong><p>Hand over if the answer needs a person.</p></div></div><div class="preview-foot"><span>Team stays in the loop</span><span>Follow-up stays visible ↗</span></div>'
  },
  {
    label: 'QUOTES & DOCUMENTS',
    title: 'Start from a draft, with the details in place.',
    description: 'Turn job notes and your own templates into a document your team can check, rather than start from a blank page.',
    points: ['Use your existing information and templates', 'Make missing details visible', 'Keep approval with your team'],
    preview: '<div class="preview-bar"><span><i></i> DOCUMENT WORKFLOW</span><span class="sample-badge">ILLUSTRATIVE</span></div><div class="message-card"><div class="message-meta"><span>Job notes</span><span>Captured</span></div><p>Prepare a draft from the agreed scope and the business\'s own information.</p></div><div class="draft-lines"><div><span>Scope of work</span><span>Included</span></div><div><span>Template and price list</span><span>Owner supplied</span></div><div><span>Missing information</span><span>Flag for review</span></div></div><div class="workflow-connector"></div><div class="action-card"><span class="action-icon">✓</span><div><strong>Staff review before sending</strong><p>The final decision stays with a person.</p></div></div>'
  },
  {
    label: 'EVERYDAY ADMIN',
    title: 'Connect the steps that keep getting repeated.',
    description: 'Map the manual job first, then connect the useful steps between the tools you already use.',
    points: ['Reduce repeated copying and checking', 'Keep exceptions visible', 'Compare results with the current process'],
    preview: '<div class="preview-bar"><span><i></i> ADMIN WORKFLOW</span><span class="sample-badge">ILLUSTRATIVE</span></div><div class="workflow-rows"><div class="workflow-row"><span>01</span>New information arrives</div><div class="workflow-row"><span>02</span>Check for missing or duplicate records</div><div class="workflow-row"><span>03</span>Update the shared business tools</div><div class="workflow-row"><span>04</span>Send exceptions to a person</div></div><div class="preview-foot"><span>Tools stay connected</span><span>Checks stay visible ↗</span></div>'
  },
  {
    label: 'OWNER VISIBILITY',
    title: 'Know what needs attention, in one place.',
    description: 'Bring the right information together so an owner can see the next action without opening every tool.',
    points: ['A view built around business decisions', 'Trace each field to its source', 'See what needs a human response'],
    preview: '<div class="preview-bar"><span><i></i> OWNER VIEW</span><span class="sample-badge">ILLUSTRATIVE</span></div><div class="report-tiles"><div><span>ENQUIRIES</span><strong>New leads</strong></div><div><span>FOLLOW-UP</span><strong>Next actions</strong></div><div><span>REVIEW</span><strong>Needs a person</strong></div></div><ul class="report-list"><li>Enquiry inbox<span>Connected</span></li><li>Shared business sheet<span>Connected</span></li><li>Owner review list<span>Visible</span></li></ul><div class="action-card"><span class="action-icon">↗</span><div><strong>Clear information, clear next action</strong><p>Check the data against the original source.</p></div></div>'
  }
];

const solutionTabs = [...document.querySelectorAll('[data-solution]')];
function selectSolution(index, focus = false) {
  const data = solutions[index];
  solutionTabs.forEach((tab, tabIndex) => {
    tab.setAttribute('aria-selected', String(tabIndex === index));
    tab.tabIndex = tabIndex === index ? 0 : -1;
  });
  document.getElementById('solution-panel').setAttribute('aria-labelledby', solutionTabs[index].id);
  const copy = document.getElementById('solution-copy');
  copy.replaceChildren(element('span', 'tiny-label green', data.label), element('h3', '', data.title), element('p', '', data.description));
  const list = element('ul', 'solution-bullets');
  data.points.forEach(point => list.append(element('li', '', point)));
  const link = element('a', 'text-link', 'Plan a project like this');
  link.href = 'brief.html';
  link.insertAdjacentHTML('beforeend', '<span aria-hidden="true">↗</span>');
  copy.append(list, link);
  document.getElementById('workflow-preview').innerHTML = data.preview;
  if (focus) solutionTabs[index].focus();
}
if (solutionTabs.length) {
  solutionTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectSolution(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % solutionTabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + solutionTabs.length) % solutionTabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = solutionTabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectSolution(next, true);
    });
  });
  selectSolution(0);
}

// A local, useful first brief. It is a discussion aid, not a quote or an application.
const plannerSteps = [
  {question: 'What kind of business is this for?', helper: 'Start with a little business context.', options: ['Tuition & enrichment', 'Renovation & interiors', 'Retail & hospitality', 'Home & professional services', 'Another type of business']},
  {question: 'What gets in the way?', helper: 'Choose the job that feels closest.', options: ['Enquiry reply & follow-up', 'Quotes & document drafts', 'Bookings & reminders', 'Repeated admin tasks', 'Reports & business visibility', 'Something else']},
  {question: 'Where does the work happen today?', helper: 'We start with the tools and process you already use.', options: ['WhatsApp, email & phone', 'Spreadsheets', 'Existing business software', 'A mix of tools and manual work']}
];
const projectDirections = [
  {name: 'Enquiry reply & follow-up', build: 'A shared enquiry list, draft replies based on your business information and visible next actions for the team.', builder: 'Messaging and workflow automation', check: 'A test enquiry is captured, assigned and followed through. A person can take over, and uncertain answers are escalated.', clarify: 'Enquiry channels, approved information, who owns each lead and what should require a person.'},
  {name: 'Quote & document drafting', build: 'A draft generated from job notes, your own information and an agreed document template, ready for staff review.', builder: 'Document automation and integrations', check: 'Use a representative job to compare the draft with the approved template. Missing information is flagged, and staff approve the final document.', clarify: 'Templates, the source of each field, pricing rules, approval steps and who sends the document.'},
  {name: 'Bookings & reminders', build: 'A connected booking process with reminders and a clear view of the appointments that need confirmation.', builder: 'Scheduling and messaging workflows', check: 'Check a test booking, a changed booking and a cancellation. The right person receives the right update, without a duplicate.', clarify: 'Calendar access, booking rules, reminder timing and how changes are handled.'},
  {name: 'A repeated admin workflow', build: 'The manual job mapped step by step, with useful connections between the tools your team already uses.', builder: 'Workflow automation and integrations', check: 'Run the automated steps beside the current process with sample records. Compare the result and test missing or duplicate information.', clarify: 'What starts the job, where information comes from, exceptions and who checks the result.'},
  {name: 'A useful owner view', build: 'A sheet or dashboard focused on the business decisions and next actions you need to see.', builder: 'Data integrations and reporting', check: 'Trace fields back to the source, compare the totals and check that the view highlights the right next actions.', clarify: 'The decisions the report supports, sources, refresh needs and who maintains the information.'},
  {name: 'A project to scope together', build: 'First, a walkthrough of the current job and the result you need. The technical approach comes after that.', builder: 'Chosen after the job is understood', check: 'Agree a specific outcome and a practical acceptance test before implementation.', clarify: 'What happens today, what gets in the way, where information lives and what done looks like.'}
];
const startingNotes = [
  'Map the conversation channels and agree how information moves into a shared list.',
  'Check the structure and ownership of the sheet before designing a connection.',
  'Confirm the software can connect, what access it needs and which existing features may already help.',
  'Walk through one real example and agree which steps and tools should be connected.'
];
const planner = document.getElementById('planner-app');
let plannerStep = 0;
let plannerAnswers = [null, null, null];
let extraContext = '';

function focusPlannerHeading() {
  const heading = planner?.querySelector('h3');
  if (!heading) return;
  heading.tabIndex = -1;
  heading.focus({preventScroll: true});
}

function briefRows() {
  const direction = projectDirections[plannerAnswers[1]];
  return [
    ['Business', plannerSteps[0].options[plannerAnswers[0]]],
    ['Possible build', direction.build],
    ['Builder expertise', direction.builder],
    ['What to check', direction.check],
    ['Starting point', startingNotes[plannerAnswers[2]]],
    ['What to clarify', direction.clarify]
  ];
}

function saveProjectBrief() {
  if (plannerStep !== 3 || plannerAnswers.some(answer => answer === null)) return;
  const direction = projectDirections[plannerAnswers[1]];
  const content = ['XASIS / FIRST PROJECT BRIEF', direction.name, '', 'A draft for discussion. Scope, budget and timing need to be agreed.', ''];
  briefRows().forEach(([label, value]) => content.push(label.toUpperCase(), value, ''));
  if (extraContext.trim()) content.push('ADDITIONAL CONTEXT', extraContext.trim(), '');
  content.push('NEXT CONVERSATION', 'Walk through the real workflow, check whether the tools can connect, and agree a useful outcome before any build starts.', '', 'Send this brief to hello@xasis.app to start the conversation.');
  downloadText('xasis-project-brief.txt', content.join('\n'));
  notify('Your project brief is ready to save.');
}

function renderPlanner() {
  if (!planner) return;
  planner.replaceChildren();
  const top = element('div', 'planner-top');
  top.append(element('span', 'tiny-label', 'XASIS / PROJECT PLANNER'), element('span', 'step-count', plannerStep < 3 ? `${plannerStep + 1} / 3` : 'Ready to save'));
  planner.append(top);
  const progress = element('ol', 'wizard-track');
  progress.setAttribute('aria-label', 'Project brief steps');
  ['Business', 'Problem', 'Current process'].forEach((name, index) => {
    const item = element('li', index === plannerStep ? 'current' : index < plannerStep ? 'complete' : '');
    if (index === plannerStep) item.setAttribute('aria-current', 'step');
    item.append(element('span', '', String(index + 1)), element('small', '', name));
    progress.append(item);
  });
  planner.append(progress);

  if (plannerStep === 3) {
    const result = element('div', 'planner-result');
    result.id = 'brief-result';
    const heading = element('div', 'result-heading');
    heading.append(element('span', '', '✓'), element('h3', '', projectDirections[plannerAnswers[1]].name));
    result.append(heading);
    const rows = element('dl', 'brief-rows');
    briefRows().forEach(([label, value]) => {
      const row = element('div');
      row.append(element('dt', '', label), element('dd', '', value));
      rows.append(row);
    });
    result.append(rows);
    const context = element('div', 'result-context');
    const label = element('label', '', 'Anything else we should understand? (optional)');
    label.htmlFor = 'project-context';
    const input = element('textarea');
    input.id = 'project-context';
    input.rows = 2;
    input.maxLength = 2500;
    input.placeholder = 'A detail about the job, the tools or what a good result looks like.';
    input.value = extraContext;
    input.addEventListener('input', () => { extraContext = input.value; });
    context.append(label, input);
    result.append(context);
    const actions = element('div', 'result-actions');
    const save = element('button', 'button button-dark', 'Save my brief');
    save.type = 'button';
    save.id = 'save-brief';
    save.insertAdjacentHTML('beforeend', arrow);
    save.addEventListener('click', saveProjectBrief);
    const back = element('button', 'text-button', 'Back');
    back.type = 'button';
    back.addEventListener('click', () => { plannerStep = 2; renderPlanner(); focusPlannerHeading(); });
    const reset = element('button', 'text-button', 'Start again');
    reset.type = 'button';
    reset.addEventListener('click', () => { plannerStep = 0; plannerAnswers = [null, null, null]; extraContext = ''; renderPlanner(); focusPlannerHeading(); });
    actions.append(save, back, reset);
    result.append(actions, element('p', 'brief-fine', 'A useful starting point for a conversation. This is a draft, and no details have been sent. Email the saved brief to hello@xasis.app to start the conversation.'));
    planner.append(result);
    return;
  }

  const current = plannerSteps[plannerStep];
  planner.append(element('h3', 'planner-question', current.question), element('p', 'planner-helper', current.helper));
  const fieldset = element('fieldset', 'planner-choice-set');
  fieldset.setAttribute('aria-label', current.question);
  const options = element('div', 'planner-options');
  const continueButton = element('button', 'button button-dark', 'Continue');
  continueButton.type = 'button';
  continueButton.disabled = plannerAnswers[plannerStep] === null;
  let selected = plannerAnswers[plannerStep];
  current.options.forEach((option, index) => {
    const label = element('label', 'planner-choice');
    const radio = element('input');
    radio.type = 'radio';
    radio.name = 'planner-choice';
    radio.value = String(index);
    radio.checked = selected === index;
    radio.addEventListener('change', () => {
      selected = index;
      continueButton.disabled = false;
    });
    label.append(radio, element('span', 'option-symbol', ['↗', '≡', '◷', '⌘', '▤', '+'][index]), element('span', '', option));
    options.append(label);
  });
  fieldset.append(options);
  planner.append(fieldset);
  continueButton.addEventListener('click', () => {
    if (selected === null) return;
    if (plannerAnswers[plannerStep] !== selected) {
      for (let next = plannerStep + 1; next < 3; next++) plannerAnswers[next] = null;
    }
    plannerAnswers[plannerStep] = selected;
    plannerStep++;
    renderPlanner();
    focusPlannerHeading();
  });
  const controls = element('div', 'planner-controls');
  if (plannerStep > 0) {
    const back = element('button', 'text-button', 'Back');
    back.type = 'button';
    back.addEventListener('click', () => { plannerStep--; renderPlanner(); focusPlannerHeading(); });
    controls.append(back);
  }
  controls.append(continueButton);
  planner.append(controls);
}
if (planner) renderPlanner();

// The builder profile is prepared locally. No personal details are transmitted.
const builderForm = document.getElementById('builder-form');
const builderSuccess = document.getElementById('builder-success');
let builderProfile;

builderForm?.addEventListener('submit', event => {
  event.preventDefault();
  if (!builderForm.reportValidity()) return;
  builderProfile = Object.fromEntries(new FormData(builderForm));
  const summary = document.getElementById('builder-summary');
  summary.textContent = `${builderProfile.name}, your profile brings together your focus on ${builderProfile.specialty.toLowerCase()}, your working example and your availability.`;
  const profile = document.getElementById('builder-profile');
  profile.replaceChildren();
  [
    ['Name', builderProfile.name.trim()],
    ['Email', builderProfile.email.trim()],
    ['Main strength', builderProfile.specialty],
    ['Relevant example', builderProfile.example.trim()],
    ['Link to work', builderProfile.portfolio.trim() || 'Not supplied'],
    ['Availability', builderProfile.availability]
  ].forEach(([label, value]) => {
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', value));
    profile.append(row);
  });
  builderForm.hidden = true;
  builderSuccess.hidden = false;
  builderSuccess.focus({preventScroll: true});
  builderSuccess.scrollIntoView({block: 'start', behavior: 'instant'});
});
document.getElementById('edit-introduction')?.addEventListener('click', () => {
  builderSuccess.hidden = true;
  builderForm.hidden = false;
  document.getElementById('builder-name').focus({preventScroll: true});
  builderForm.scrollIntoView({block: 'start', behavior: 'instant'});
});
document.getElementById('download-introduction')?.addEventListener('click', () => {
  if (!builderProfile) return;
  const content = [
    'XASIS / BUILDER INTRODUCTION',
    'Prepared locally, ready to share. No project assignment is implied.', '',
    'NAME', builderProfile.name.trim(), '',
    'EMAIL', builderProfile.email.trim(), '',
    'MAIN STRENGTH', builderProfile.specialty, '',
    'RELEVANT EXAMPLE', builderProfile.example.trim(), '',
    'LINK TO WORK', builderProfile.portfolio.trim() || 'Not supplied', '',
    'AVAILABILITY', builderProfile.availability, '',
    'FOR A PROJECT CONVERSATION',
    'Discuss the business job, working example, constraints, scope, availability, handover and commercial terms.', '',
    'Send this introduction to hello@xasis.app.'
  ];
  downloadText('xasis-builder-introduction.txt', content.join('\n'));
  notify('Your builder introduction is ready to save.');
});
