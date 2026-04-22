// js/dashboard.js — HR Onboarding Tracker page logic
import { $, qs, qsa, on, show, hide } from './core.js';


// --- page-aware bootstrap  ---
document.addEventListener('DOMContentLoaded', () => {
  const isDashboard = !!document.getElementById('app-container');   // HRDashboard page marker
  const isLanding   = !!document.getElementById('mobileMenu');      // Landing page marker

  // Small helpers
  const $ = (id) => document.getElementById(id);
  const show = (el) => el && (el.style.display = '');
  const hide = (el) => el && (el.style.display = 'none');

  // Expose helpers if later code expects global scope
  window.__page = { isDashboard, isLanding, $, show, hide };

  // If it's the landing page only, wire the tiny mobile menu and STOP.
  if (isLanding && !isDashboard) {
    const btn  = $('menuBtn');
    const menu = $('mobileMenu');
    if (btn && menu) {
      btn.addEventListener('click', () => {
        const hidden = menu.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', String(!hidden));
      });
    }
    return; // prevent any dashboard logic from running here
  }
  // Drawer toggle for Admin Panel
  const drawer = document.getElementById('admin-drawer');
  const adminToggle = document.getElementById('admin-toggle');
  const adminClose = document.getElementById('admin-close');
  if (adminToggle && drawer) {
    adminToggle.addEventListener('click', () => drawer.classList.add('open'));
  }
  if (adminClose && drawer) {
    adminClose.addEventListener('click', () => drawer.classList.remove('open'));
  }

  document.getElementById('nav-dashboard').addEventListener('click', () => showView('dashboard'));
  document.getElementById('nav-new').addEventListener('click', () => {
    editingOnboarding = null;
    document.getElementById('onboarding-form').reset();
    showView('new');
  });
  document.getElementById('nav-email').addEventListener('click', () => showView('email'));
  
  // Add search input listener if it exists
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }
  
  document.getElementById('filter-hire-type').addEventListener('change', applyFilters);
  document.getElementById('filter-status').addEventListener('change', applyFilters);
  document.getElementById('load-from-github').addEventListener('click', loadDataFromServer);
  document.getElementById('save-data').addEventListener('click', saveData);
  document.getElementById('export-data').addEventListener('click', exportData);
  document.getElementById('import-data').addEventListener('change', importData);

  document.getElementById('delete-completed').addEventListener('click', () => {
    const c = onboardings.filter(o => o.status === 'completed').length;
    if (c === 0) {
      showConfirmDialog('No completed onboardings.', () => {});
    } else {
      showConfirmDialog(`Delete ${c} completed?`, () => {
        onboardings = onboardings.filter(o => o.status !== 'completed');
        applyFilters();
        updateStats();
		updateInsightCharts();
        autoSave();
      });
    }
  });

  document.getElementById('clear-all-data').addEventListener('click', () => {
    showConfirmDialog('Delete ALL data?', () => {
      onboardings = [];
      applyFilters();
      updateStats();
      autoSave();
    });
  });

  document.getElementById('back-to-dashboard').addEventListener('click', () => showView('dashboard'));

  document.getElementById('edit-details').addEventListener('click', () => {
    const o = onboardings.find(x => x.id === selectedOnboardingId);
    if (!o) return;
    document.getElementById('form-name').value = o.name || '';
    document.getElementById('form-hire-type').value = o.hireType || '';
    document.getElementById('form-start-date').value = o.startDate || '';
    document.getElementById('form-request-received').value = o.requestReceived || '';
    document.getElementById('form-title').value = o.title || '';
    document.getElementById('form-uin').value = o.uin || '';
    document.getElementById('form-lf').value = o.lf || '';
    document.getElementById('form-manager').value = o.manager || '';
    document.getElementById('form-email').value = o.email || '';
    document.getElementById('form-hire-category').value = o.hireCategory || 'Newhire';
    document.getElementById('form-international-hire').checked = !!o.internationalHire;
    document.getElementById('form-comment').value = o.comment || '';
    document.getElementById('form-pin').value = o.pin || '';
    editingOnboarding = o.id;
    showView('new');
  });

  document.getElementById('create-onboarding').addEventListener('click', (e) => {
    e.preventDefault();
    const formData = {
      name: document.getElementById('form-name').value.trim(),
      hireType: document.getElementById('form-hire-type').value,
      startDate: document.getElementById('form-start-date').value,
      requestReceived: document.getElementById('form-request-received').value,
      title: document.getElementById('form-title').value.trim(),
      uin: document.getElementById('form-uin').value.trim(),
      lf: document.getElementById('form-lf').value.trim(),
      manager: document.getElementById('form-manager').value.trim(),
      email: document.getElementById('form-email').value.trim(),
      internationalHire: document.getElementById('form-international-hire').checked,
      hireCategory: document.getElementById('form-hire-category').value,
      comment: document.getElementById('form-comment').value.trim(),
      pin: document.getElementById('form-pin').value.trim()
    };
    if (!formData.name || !formData.hireType || !formData.startDate || !formData.requestReceived) {
      showConfirmDialog('Please fill required fields.', () => {});
      return;
    }
    const tasks = getFilteredTasks(formData.hireCategory, formData.hireType);
    if (editingOnboarding !== null) {
      const o = onboardings.find(x => x.id === editingOnboarding);
      if (o) Object.assign(o, formData);
      editingOnboarding = null;
    } else {
      const newId = Date.now();
      onboardings.push({
        id: newId,
        ...formData,
        status: 'active',
        progress: 0,
        overdueTasks: 0,
        totalTasks: tasks.length,
        taskCompletionDates: {}
      });
    }
    document.getElementById('onboarding-form').reset();
    showView('dashboard');
    applyFilters();
    updateStats();
    autoSave();
  });

  document.getElementById('cancel-create').addEventListener('click', () => {
    editingOnboarding = null;
    document.getElementById('onboarding-form').reset();
    showView('dashboard');
  });

  document.getElementById('include-completed').addEventListener('change', updateEmailEmployeeList);
	function refreshGenerateEnabled() {
	  const type = document.getElementById('email-type').value;
	  const empVal = document.getElementById('email-employee').value;
	  // Prospective email does NOT require an employee selection
	  const needsEmployee = type !== 'prospectiveWelcome';
	  document.getElementById('generate-email').disabled = needsEmployee && !empVal;
	}
	document.getElementById('email-employee').addEventListener('change', refreshGenerateEnabled);
	document.getElementById('email-type').addEventListener('change', refreshGenerateEnabled);

	// run once at load if needed
	refreshGenerateEnabled();

	document.getElementById('copy-email').addEventListener('click', async () => {
	  const html = document.getElementById('email-message').innerHTML;
	  const blob = new Blob([html], { type: "text/html" });
	  const data = [new ClipboardItem({ "text/html": blob })];
	  await navigator.clipboard.write(data);
	  showToast("Copied with formatting");
	});

	document.getElementById('open-email-client').addEventListener('click', () => {
	  const type = document.getElementById('email-type').value;
	  const out = document.getElementById('email-message');

	  // Prefer the plain-text copy stored by the generator branch
	  const bodyPlain = out.dataset.plain || out.innerText || "";

	  let to = "";
	  let subject = out.dataset.subject || "Onboarding";

	  // Only prefill a recipient if a specific employee is selected
	  if (type !== 'prospectiveWelcome') {
		const empId = document.getElementById('email-employee').value;
		const emp = onboardings.find(x => x.id.toString() === empId);
		if (emp && emp.email) to = emp.email;
		if (!out.dataset.subject && emp && emp.name) subject = `Onboarding: ${emp.name}`;
	  }

	  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyPlain)}`;
	  window.location.href = mailto;
	});

		
	document.getElementById('card-active').addEventListener('click', () => applyQuickFilter('active'));
	document.getElementById('card-completed').addEventListener('click', () => applyQuickFilter('completed'));
	document.getElementById('card-overdue').addEventListener('click', () => applyQuickFilter('overdue'));
  
  // Edit Comment functionality
	const editCommentBtn = document.getElementById('edit-comment-btn');
	const editCommentModal = document.getElementById('edit-comment-modal');
	const modalCommentInput = document.getElementById('modal-comment-input');
	const modalCommentCancel = document.getElementById('modal-comment-cancel');
	const modalCommentSave = document.getElementById('modal-comment-save');

	if (editCommentBtn && editCommentModal) {
	  editCommentBtn.addEventListener('click', () => {
		const o = onboardings.find(x => x.id === selectedOnboardingId);
		if (!o) return;
		modalCommentInput.value = o.comment || "";
		editCommentModal.classList.remove('hidden');
	  });
	}

	if (modalCommentCancel) {
	  modalCommentCancel.addEventListener('click', () => {
		editCommentModal.classList.add('hidden');
	  });
	}

	if (modalCommentSave) {
	  modalCommentSave.addEventListener('click', () => {
		const o = onboardings.find(x => x.id === selectedOnboardingId);
		if (!o) return;
		o.comment = modalCommentInput.value.trim();
		renderCommentDetail(o);
		editCommentModal.classList.add('hidden');
		autoSave();
	  });
	}


  // Auto-load from GitHub & initialize view as in your original
  loadDataFromServer();
  showView('dashboard');
  document.getElementById('filter-status').value = 'active';
  applyFilters();
  updateStats();
});

const PASSWORD_HASH = 'e6a611216c6c2565e82a42140023e48089c5edb0ad44c4ceb25c1b575012baa5';
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkPassword() {
  const input = document.getElementById('password-input').value;
  const inputHash = await hashPassword(input);
  if (inputHash === PASSWORD_HASH) {
    sessionStorage.setItem('authenticated', 'true');
    hide($('login-screen'));
    document.getElementById('app-container').classList.add('authenticated');
  } else {
    document.getElementById('login-error').classList.remove('hidden');
    document.getElementById('password-input').value = '';
    document.getElementById('password-input').focus();
  }
}
function checkAuth() {
  if (sessionStorage.getItem('authenticated') === 'true') {
    hide($('login-screen'));
    document.getElementById('app-container').classList.add('authenticated');
  }
}
checkAuth();
document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  checkPassword();
});

// GITHUB CONFIGURATION
const GITHUB_CONFIG = {
  token: localStorage.getItem('githubToken') || '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',
  owner: 'paytonbaldridge777',
  repo: 'HRDashboard',
  branch: 'main',
  filePath: 'data.json'
};

let onboardings = [];
let filteredOnboardings = [];
let currentView = 'dashboard';
let selectedOnboardingId = null;
let editingOnboarding = null;
let githubFileSha = null;
let saveTimeout = null;
let isSaving = false;
let chartsAnimated = false;

const hrTasks = [
  "LF Review Processed",
  "PHF Form",
  "Process in WD",
  "I-9 in Guardian",
  "Onboarding Email Sent",
  "Disclosure of Student Status Form Sent",
  "Disclosure of Student Status Form Received",
  "Disclosure of Student Status Form Uploaded",
  "I-9 Section 1 Complete",
  "I-9 Section 2 Complete",  
  "WorkDay at Onboarding Step",
  "Workday Onboarding Started",
  "Workday Onboarding Completed",
  "LF Hold till BP/Start Date Done"
];


function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('toast-show');
  setTimeout(() => {
    t.classList.remove('toast-show');
    setTimeout(() => t.classList.add('hidden'), 300);
  }, duration);
}

function showView(viewName) {
  ['dashboard', 'new', 'email', 'task-detail'].forEach(v => {
    const el = document.getElementById(v + '-view');
    if (el) el.classList.add('hidden');
    const btn = document.getElementById('nav-' + v);
    if (btn) btn.className = 'px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none';
  });
  const targetEl = document.getElementById(viewName + '-view');
  if (targetEl) targetEl.classList.remove('hidden');
  const activeBtn = document.getElementById('nav-' + viewName);
  if (activeBtn) activeBtn.className = 'px-4 py-2 rounded-lg bg-rose-800 text-white hover:bg-stone-400 focus:outline-none';
  currentView = viewName;
}

function calculateDueDate(task, startDate, requestReceived) {
  if (!startDate && !requestReceived) return null;
  const start = startDate ? new Date(startDate) : null;
  const received = requestReceived ? new Date(requestReceived) : null;
  switch (task) {
    case "LF Review Processed":
      if (!received) return null;
      const d1 = new Date(received);
      d1.setDate(d1.getDate() + 1);
      return d1.toISOString().split('T')[0];
    case "PHF Form":
      if (!start) return null;
      const d2 = new Date(start);
      d2.setDate(d2.getDate() - 10);
      return d2.toISOString().split('T')[0];
    case "Process in WD":
      if (!start) return null;
      const d3 = new Date(start);
      d3.setDate(d3.getDate() - 7);
      return d3.toISOString().split('T')[0];
    case "Onboarding Email Sent":
      if (!start) return null;
      const d4 = new Date(start);
      d4.setDate(d4.getDate() - 7);
      return d4.toISOString().split('T')[0];
    case "WorkDay at Onboarding Step":
      return startDate;
    case "Workday Onboarding Completed":
      if (!start) return null;
      const d5 = new Date(start);
      d5.setDate(d5.getDate() + 3);
      return d5.toISOString().split('T')[0];
    case "LF Hold till BP/Start Date Done":
      if (!start) return null;
      const d6 = new Date(start);
      d6.setDate(d6.getDate() + 3);
      return d6.toISOString().split('T')[0];
    default:
      return null;
  }
}

function getFilteredTasks(hireCategory, hireType) {
  const category = hireCategory || 'Newhire';
  const isStudentHireType = (hireType || '').trim().toLowerCase().includes('student');
  if (category === 'Addjob' || category === 'Transfer') {
    return hrTasks.filter(t =>
      t !== "I-9 in Guardian" &&
      t !== "Onboarding Email Sent" &&
      t !== "Disclosure of Student Status Form Sent" &&
      t !== "Disclosure of Student Status Form Received" &&
      t !== "Disclosure of Student Status Form Uploaded"
    );
  }
  if (!isStudentHireType) {
    return hrTasks.filter(t =>
      t !== "Disclosure of Student Status Form Sent" &&
      t !== "Disclosure of Student Status Form Received" &&
      t !== "Disclosure of Student Status Form Uploaded"
    );
  }
  return hrTasks;
}

function updateStats() {
  const activeList = onboardings.filter(o => o.status === 'active');
  const completedList = onboardings.filter(o => o.status === 'completed');
  const stats = {
    active: activeList.length,
    completed: completedList.length,
    overdue: onboardings.reduce((sum, o) => sum + (o.overdueTasks || 0), 0)
  };

  document.getElementById('stat-active').textContent = stats.active;
  document.getElementById('stat-completed').textContent = stats.completed;
  document.getElementById('stat-overdue').textContent = stats.overdue;

  updateAverageCompletionTime(completedList);
  updateInsightCharts(); // use the new compact right-side charts
}

// Calculate Average Completion Time
function updateAverageCompletionTime(completedList) {
  const avgEl = document.getElementById('avg-completion-time');
  if (!avgEl) return;

  let totalDays = 0;
  let count = 0;

  completedList.forEach(o => {
    if (o.requestReceived && o.startDate) {
      const start = new Date(o.startDate);
      const received = new Date(o.requestReceived);
      const diffDays = Math.round((start - received) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        totalDays += diffDays;
        count++;
      }
    }
  });

  const avgDays = count ? (totalDays / count).toFixed(1) : '--';
  avgEl.textContent = avgDays === '--' ? '-- days' : `${avgDays} days`;
}

// --- Chart helpers ---
function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
}

// Pie Chart 
function renderPieChart(containerId, dataMap, order, colors) {
  const svg = document.getElementById(containerId);
  if (!svg) return;
  svg.innerHTML = '';

  const total = order.reduce((sum, k) => sum + (dataMap[k] || 0), 0);
  if (total === 0) {
    svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="12" fill="#999">No Data</text>`;
    return;
  }

  const size = 140;
  const radius = 60;
  const center = size / 2;
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

  let cumulative = 0;
  order.forEach((key, i) => {
    const val = dataMap[key] || 0;
    if (!val) return;
    const percent = val / total;
    const start = cumulative * 2 * Math.PI;
    cumulative += percent;
    const end = cumulative * 2 * Math.PI;

    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    const largeArc = percent > 0.5 ? 1 : 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d', `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`);
    path.setAttribute('fill', colors[i % colors.length]);
    path.style.opacity = '0';
    path.classList.add('cursor-pointer');
    svg.appendChild(path);

    // Add % label
    const mid = start + (end - start) / 2;
    const lx = center + (radius * 0.6) * Math.cos(mid);
    const ly = center + (radius * 0.6) * Math.sin(mid);
    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', lx);
    label.setAttribute('y', ly);
    label.setAttribute('fill', '#fff');
    label.setAttribute('font-size', '10');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('alignment-baseline', 'middle');
    label.textContent = `${(percent * 100).toFixed(0)}%`;
    svg.appendChild(label);

    // Tooltip
    path.addEventListener('mouseenter', (e) => {
      const tooltip = document.createElement('div');
      tooltip.id = 'chart-tooltip';
      tooltip.textContent = `${key}: ${val} (${(percent * 100).toFixed(1)}%)`;
      tooltip.style.position = 'fixed';
      tooltip.style.background = 'rgba(0,0,0,0.75)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '4px 8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '11px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '9999';
      document.body.appendChild(tooltip);

      const move = (ev) => {
        tooltip.style.left = ev.clientX + 8 + 'px';
        tooltip.style.top = ev.clientY + 8 + 'px';
      };
      document.addEventListener('mousemove', move);

      path.addEventListener('mouseleave', () => {
        tooltip.remove();
        document.removeEventListener('mousemove', move);
      }, { once: true });
    });

    if (!chartsAnimated) {
	  requestAnimationFrame(() => {
		path.style.transition = 'opacity 600ms ease-out';
		path.style.opacity = '1';
	  });
	} else {
	  path.style.opacity = '1'; // instantly show if already animated
	}
  });
}

function renderCountBarChart(containerId, dataMap, order, colorClass = 'bg-blue-500') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  const maxVal = Math.max(...order.map(k => dataMap[k] || 0), 1);
  const wrapper = document.createElement('div');
  wrapper.className = 'w-full space-y-1';

  order.forEach(key => {
    const value = dataMap[key] || 0;
    const pct = (value / maxVal) * 100;

    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 text-xs';

    const label = document.createElement('div');
    label.className = 'w-20 text-gray-700 truncate';
    label.textContent = key;

    const barWrap = document.createElement('div');
    barWrap.className = 'flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative';

    const bar = document.createElement('div');
    bar.className = `absolute left-0 top-0 h-3 rounded-full transition-all duration-700 ease-out ${colorClass}`;
    bar.style.width = '0%';

    const valueLabel = document.createElement('div');
    valueLabel.className = 'ml-2 text-gray-700 w-10';
    valueLabel.textContent = value;

    barWrap.appendChild(bar);
    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(valueLabel);
    wrapper.appendChild(row);

    // Animate width
    requestAnimationFrame(() => {
      bar.style.width = pct + '%';
    });
  });

  el.appendChild(wrapper);
}

// Bar chart
function renderAvgDaysChart(containerId, dataMap, order, colorClass='bg-blue-500') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  const maxVal = Math.max(...order.map(k => dataMap[k] || 0), 1);
  const wrapper = document.createElement('div');
  wrapper.className = 'w-full space-y-1';

  order.forEach(key => {
    const value = dataMap[key] || 0;
    const pct = (value / maxVal) * 100;

    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 text-xs';

    const label = document.createElement('div');
    label.className = 'w-20 text-gray-700 truncate';
    label.textContent = key;

    const barWrap = document.createElement('div');
    barWrap.className = 'flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative';

    const bar = document.createElement('div');
    bar.className = `absolute left-0 top-0 h-3 rounded-full ${colorClass}`;
    bar.style.width = '0%';
    const valueLabel = document.createElement('div');
    valueLabel.className = 'ml-2 text-gray-700 w-10';
    valueLabel.textContent = value.toFixed(1);

    barWrap.appendChild(bar);
    row.appendChild(label);
    row.appendChild(barWrap);
    row.appendChild(valueLabel);
    wrapper.appendChild(row);

    if (!chartsAnimated) {
	  requestAnimationFrame(() => {
		bar.style.transition = 'width 700ms ease-out';
		bar.style.width = pct + '%';
	  });
	} else {
	  bar.style.width = pct + '%'; // instantly show without reanimating
	}
  });

  el.appendChild(wrapper);
}

function applyQuickFilter(type) {
  const hireFilter = document.getElementById('filter-hire-type');
  const statusFilter = document.getElementById('filter-status');

  hireFilter.value = ''; // always show all hire types

  if (type === 'active') {
    statusFilter.value = 'active';
    filteredOnboardings = onboardings.filter(o => o.status === 'active');
  } else if (type === 'completed') {
    statusFilter.value = 'completed';
    filteredOnboardings = onboardings.filter(o => o.status === 'completed');
  } else if (type === 'overdue') {
    // show all that have at least one overdue task
    statusFilter.value = 'overdue'; // clear dropdown selection
    filteredOnboardings = onboardings.filter(o => o.overdueTasks && o.overdueTasks > 0);
  }

  renderOnboardingCards();
  updateStats();
}


function renderOnboardingCards() {
  const container = document.getElementById('onboarding-cards');
  container.innerHTML = '';
  filteredOnboardings.forEach(o => {
    const tasks = getFilteredTasks(o.hireCategory, o.hireType);
    const done = Object.keys(o.taskCompletionDates || {}).filter(t => tasks.includes(t)).length;
    const commentText = o.comment ? o.comment : '';
    const pinText = o.pin ? o.pin : 'N/A';
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full';
    card.innerHTML = `
      <div class="p-6 flex flex-col h-full">
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h3 class="text-lg font-semibold">${o.name}</h3>
            <p class="text-gray-600">${o.hireType} • ${o.hireCategory}</p>
            <p class="text-sm text-gray-500">${o.title || ''}</p>
            <p class="text-xs text-gray-400">UIN: ${o.uin || 'N/A'} | LF: ${o.lf || 'N/A'} | PIN: ${pinText}</p>
            <p class="text-xs text-gray-400">Request: ${o.requestReceived || 'N/A'}</p>
            <p class="text-xs text-gray-400">Start: ${o.startDate || 'N/A'} ${o.internationalHire ? ' • International' : ''}</p>
            ${commentText ? `<p class="mt-2 text-sm text-gray-700 italic">"${commentText}"</p>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 rounded-full text-xs ${o.overdueTasks > 0 ? 'text-red-600 bg-red-50' : (o.status === 'completed' ? 'text-green-600 bg-green-50' : 'text-stone-5000 bg-rose-800-50')}">
              ${o.status}
            </span>
            <button class="delete-btn text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" data-id="${o.id}">🗑️</button>
          </div>
        </div>
        <div class="mb-4 flex-1">
          <div class="flex justify-between text-sm mb-2">
            <span>HR Tasks Progress</span>
            <span>${done}/${tasks.length}</span>
          </div>
          <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full ${o.overdueTasks > 0 ? 'bg-red-500' : (o.progress === 100 ? 'bg-green-500' : 'bg-rose-800')}" style="width:${o.progress || 0}%"></div>
          </div>
        </div>
        <button class="view-tasks-btn mt-auto w-full bg-rose-800 text-white py-2 rounded-lg hover:bg-stone-400-700 focus:outline-none" data-id="${o.id}">View HR Tasks</button>
      </div>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      showConfirmDialog('Are you sure you want to delete this onboarding?', () => {
        onboardings = onboardings.filter(x => x.id !== id);
        applyFilters();
        updateStats();
        autoSave();
      });
    });
  });

  document.querySelectorAll('.view-tasks-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      showTaskDetailView(id);
    });
  });
}

// Helper function to check if an onboarding matches the search term
function matchesSearch(onboarding, searchTerm) {
  if (!searchTerm) return true;
  
  const term = searchTerm.toLowerCase();
  
  // Search in Name
  if ((onboarding.name || '').toLowerCase().includes(term)) return true;
  
  // Search in UIN
  if ((onboarding.uin || '').toLowerCase().includes(term)) return true;
  
  // Search in Start Date
  if ((onboarding.startDate || '').toLowerCase().includes(term)) return true;
  
  // Search in Manager/Supervisor
  if ((onboarding.manager || '').toLowerCase().includes(term)) return true;
  
  // Search in LF
  if ((onboarding.lf || '').toLowerCase().includes(term)) return true;
  
  // Search in Hire Category
  if ((onboarding.hireCategory || '').toLowerCase().includes(term)) return true;
  
  // Search in Hire Type
  if ((onboarding.hireType || '').toLowerCase().includes(term)) return true;
  
  // Search for International vs Domestic
  if (onboarding.internationalHire && term.includes('international')) return true;
  if (!onboarding.internationalHire && term.includes('domestic')) return true;
  
  return false;
}

function applyFilters() {
  const hf = document.getElementById('filter-hire-type').value;
  const sf = document.getElementById('filter-status').value;
  const searchInput = document.getElementById('search-input');
  const searchTerm = searchInput ? searchInput.value.trim() : '';

  if (sf === 'overdue') {
    // show all with overdue tasks
    filteredOnboardings = onboardings.filter(o => 
      (o.overdueTasks && o.overdueTasks > 0) && matchesSearch(o, searchTerm)
    );
  } else {
    // regular active/completed filters
    filteredOnboardings = onboardings.filter(o => {
      return (hf ? o.hireType === hf : true) &&
             (sf ? o.status === sf : true) &&
             matchesSearch(o, searchTerm);
    });
  }

  renderOnboardingCards();
  updateStats();
}

function renderTaskList(o) {
  const filteredTasks = getFilteredTasks(o.hireCategory, o.hireType);
  const completed = Object.keys(o.taskCompletionDates || {}).filter(t => filteredTasks.includes(t));
  const total = filteredTasks.length;
  document.getElementById('task-progress').textContent = `${completed.length} of ${total} completed`;
  const percent = total ? Math.round((completed.length / total) * 100) : 0;
  document.getElementById('task-progress-bar').style.width = `${percent}%`;

  const noticeEl = document.getElementById('category-notice');
  if (o.hireCategory === 'Addjob' || o.hireCategory === 'Transfer') {
    noticeEl.textContent = `ℹ️ I-9 in Guardian, Onboarding Email Sent, Disclosure of Student Status Form Sent, Disclosure of Student Status Form Received, and Disclosure of Student Status Form Uploaded tasks are not required for ${o.hireCategory} category`;
    noticeEl.classList.remove('hidden');
  } else {
    noticeEl.classList.add('hidden');
  }

  const taskListEl = document.getElementById('task-list');
  taskListEl.innerHTML = '';

  filteredTasks.forEach(task => {
    const due = calculateDueDate(task, o.startDate, o.requestReceived);
    const isDone = completed.includes(task);
    const completionDate = o.taskCompletionDates?.[task] || '';
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = due && !isDone && due < today;

    // ✅ Create the container div before using it
    const div = document.createElement('div');
    div.className = `border rounded-lg p-4 ${
      isOverdue ? 'bg-red-50 border-red-400' : 'hover:bg-gray-50 border-gray-200'
    }`;

    div.innerHTML = `
      <div class="flex items-center gap-3 mb-2">
        <input type="checkbox" class="task-checkbox w-5 h-5 text-stone-5000" data-task="${task}" ${isDone ? 'checked' : ''}>
        <span class="${isDone ? 'line-through text-gray-500' : (isOverdue ? 'text-red-700 font-semibold' : '')} flex-1">${task}</span>
        ${due ? `<div class="text-xs ${isOverdue ? 'text-red-700 bg-red-100' : 'text-gray-500 bg-yellow-50'} px-2 py-1 rounded">Due: ${due}</div>` : ''}
      </div>
      <div class="ml-8 flex items-center gap-3">
        <label class="text-xs text-gray-500">Completed:</label>
        <input type="date" class="completion-date text-xs p-1 border rounded focus:ring-1 focus:ring-stone-500" data-task="${task}" value="${completionDate}">
        ${isDone && completionDate ? `<span class="text-xs text-green-600">✓ Completed on ${completionDate}</span>` : ''}
        ${isOverdue ? `<span class="text-xs text-red-600 font-medium">⚠️ Overdue</span>` : ''}
      </div>
    `;
    taskListEl.appendChild(div);
  });

  document.querySelectorAll('.task-checkbox').forEach(chk => {
    chk.addEventListener('change', (e) => {
      handleTaskToggle(e.target.dataset.task, e.target.checked);
    });
  });
  document.querySelectorAll('.completion-date').forEach(inp => {
    inp.addEventListener('change', (e) => {
      handleCompletionDateChange(e.target.dataset.task, e.target.value);
    });
  });
}


function showTaskDetailView(id) {
  const o = onboardings.find(x => x.id === id);
  if (!o) return;
  selectedOnboardingId = id;
  renderEmployeeInfo(o);
  renderCommentDetail(o);
  renderTaskList(o);
  showView('task-detail');
}

function renderEmployeeInfo(o) {
  const infoEl = document.getElementById('employee-info');
  if (!infoEl) return;
  infoEl.innerHTML = `
    <h2 class="text-2xl font-bold">${o.name}</h2>
    <p class="text-gray-600">${o.hireType} • ${o.title || ''}</p>
    <p class="text-sm text-gray-500">Start Date: ${o.startDate}</p>
    <p class="text-sm text-gray-500">Request Received: ${o.requestReceived}</p>
    <p class="text-sm text-gray-500">UIN: ${o.uin ? `<a href="https://www.myworkday.com/tamus/d/search.htmld?q=${o.uin}" target="_blank" class="text-stone-5000 hover:text-blue-800 underline">${o.uin}</a>` : 'N/A'}</p>
    <p class="text-sm text-gray-500">LF: ${o.lf ? `<a href="https://it-lf-ecmf.tamu.edu/Forms/Home/Reports#/reports/custom/simpleTable/1278/1268/detail/${o.lf}" target="_blank" class="text-stone-5000 hover:text-blue-800 underline">${o.lf}</a>` : 'N/A'}</p>
    <p class="text-sm text-gray-500">PIN: ${o.pin ? `<a href="https://www.myworkday.com/tamus/d/search.htmld?q=${o.pin}&state=searchCategory-all%3Adefault" target="_blank" class="text-stone-5000 hover:text-blue-800 underline">${o.pin}</a>` : 'N/A'}</p>
    <p class="text-sm text-gray-500">Manager: ${o.manager || 'N/A'}</p>
    <p class="text-sm text-gray-500">Email: ${o.email || 'N/A'}</p>
  `;
}

function renderCommentDetail(o) {
  const cEl = document.getElementById('detail-comment');
  if (!cEl) return;
  if (o.comment && o.comment.trim() !== "") {
    cEl.textContent = o.comment;
    cEl.classList.remove('italic', 'text-gray-400');
    cEl.classList.add('text-gray-700');
  } else {
    cEl.textContent = "No comments";
    cEl.classList.add('italic', 'text-gray-400');
  }
}

function handleTaskToggle(taskName, isChecked) {
  const o = onboardings.find(x => x.id === selectedOnboardingId);
  if (!o) return;
  const today = new Date().toISOString().split('T')[0];
  const updated = { ...(o.taskCompletionDates || {}) };
  if (isChecked) {
    updated[taskName] = today;
  } else {
    delete updated[taskName];
  }
  o.taskCompletionDates = updated;
  const tasks = getFilteredTasks(o.hireCategory, o.hireType);
  const doneCount = Object.keys(updated).filter(t => tasks.includes(t)).length;
  o.progress = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;
  if (doneCount === tasks.length) o.status = 'completed';
  renderTaskList(o);
  applyFilters();
  updateStats();
  autoSave();
}

function handleCompletionDateChange(taskName, newDate) {
  const o = onboardings.find(x => x.id === selectedOnboardingId);
  if (!o) return;
  const updated = { ...(o.taskCompletionDates || {}) };
  if (newDate) {
    updated[taskName] = newDate;
  } else {
    delete updated[taskName];
  }
  o.taskCompletionDates = updated;
  const tasks = getFilteredTasks(o.hireCategory, o.hireType);
  const doneCount = Object.keys(updated).filter(t => tasks.includes(t)).length;
  o.progress = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;
  if (doneCount === tasks.length) o.status = 'completed';
  renderTaskList(o);
  applyFilters();
  updateStats();
  autoSave();
}

function updateEmailEmployeeList() {
  const sel = document.getElementById('email-employee');
  if (!sel) return;
  sel.innerHTML = '<option value="">Choose employee</option>';
  const includeCompleted = document.getElementById('include-completed').checked;

  onboardings.forEach(o => {
    // Always include active
    if (o.status === 'active' || (includeCompleted && o.status === 'completed')) {
      const label = o.status === 'completed'
        ? `${o.name} (${o.hireType} — Completed)`
        : `${o.name} (${o.hireType} — Active)`;
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = label;
      sel.appendChild(opt);
    }
  });
}

// Generate email text
document.getElementById('generate-email').addEventListener('click', () => {
  const emailType = document.getElementById('email-type').value;

  // Handle the generic template FIRST (no employee required)
  if (emailType === "prospectiveWelcome") {
	const subject = "Welcome to Texas A&M University - Next Steps";

	const htmlBody = `
	  <p>Howdy <strong>&lt;emp name&gt;</strong>!</p>
	  <p>Please provide your UIN and year of study (for example, 1L, 2L, 3L, LLM) to begin this process.</p>
	  <p>The offer of employment you received is contingent upon successful completion of a criminal background check and the Employment Eligibility Verification Form (I-9). Please note that you should not begin working until you receive clearance that all necessary requirements have been completed.</p>
	  <p>You will receive a few emails for the hire process. You will receive a prospective hire form to complete in the Laserfiche system. After that is completed, in the next day or so, you will receive a separate email from Sterling Background Check to complete a criminal background check. After that you receive an email from Perfect Compliance with detailed instructions to complete an electronic Form I-9. After you complete the electronic form, you will be able to come in person to complete your document verification.</p>
	  <p>After you complete the form, we can schedule a time for you to come in and complete the in-person portion. Please review the List of Acceptable Documents (for example, a driver license with a social security card or a US Passport) before you come so you can gather the documents needed to complete the Form I-9. Please remember that you need to present original documents, or receipts in case your documents have been lost, stolen, or damaged.</p>
	  <p>Once the I-9 and criminal background check are completed you will be entered into Workday. You will receive emails to allow you to complete on-boarding forms in Workday.</p>
	  <p>You will also be responsible for completing mandatory training in the TrainTraq system. These trainings need to be completed at the beginning of your employment.</p>
	  <p>After completing your on-boarding requirements, you will use Workday to submit timesheets. You can go to Pay Dates, Pay Schedules, and Calendars to find a list of bi-weekly pay dates and timesheet deadlines.</p>
	  <p>Keep an eye out for the Prospective Hire Form, as none of the other processes begin until that is submitted.</p>
	  <p>Thanks!</p>
	`;

	const out = document.getElementById('email-message');
	out.innerHTML = htmlBody;
	document.getElementById('email-output').classList.remove('hidden');

	out.dataset.subject = subject;
	out.dataset.plain =
	`Howdy <emp name>!

	Please provide your UIN and year of study (for example, 1L, 2L, 3L, LLM) to begin this process.

	The offer of employment you received is contingent upon successful completion of a criminal background check and the Employment Eligibility Verification Form (I-9). Please note that you should not begin working until you receive clearance that all necessary requirements have been completed.

	You will receive a few emails for the hire process. You will receive a prospective hire form to complete in the Laserfiche system. After that is completed, in the next day or so, you will receive a separate email from Sterling Background Check to complete a criminal background check. After that you receive an email from Perfect Compliance with detailed instructions to complete an electronic Form I-9. After you complete the electronic form, you will be able to come in person to complete your document verification.

	After you complete the form, we can schedule a time for you to come in and complete the in-person portion. Please review the List of Acceptable Documents (for example, a driver license with a social security card or a US Passport) before you come so you can gather the documents needed to complete the Form I-9. Please remember that you need to present original documents, or receipts in case your documents have been lost, stolen, or damaged.

	Once the I-9 and criminal background check are completed you will be entered into Workday. You will receive emails to allow you to complete on-boarding forms in Workday.

	You will also be responsible for completing mandatory training in the TrainTraq system. These trainings need to be completed at the beginning of your employment.

	After completing your on-boarding requirements, you will use Workday to submit timesheets. You can go to Pay Dates, Pay Schedules, and Calendars to find a list of bi-weekly pay dates and timesheet deadlines.

	Keep an eye out for the Prospective Hire Form, as none of the other processes begin until that is submitted.

	Thanks!`;
	return; // done with generic path
  }

  // All other templates still need an employee
  const empId = document.getElementById('email-employee').value;
  const emp = onboardings.find(x => x.id.toString() === empId);
  if (!emp) return;

  const firstName = emp.name ? emp.name.trim().split(' ')[0] : "Employee";
  const hireDate = emp.startDate || "your start date";

  // … keep your existing other branches (e.g., i9verification) here …


	  let template = "";
		if (emailType === "i9verification") {
		  template = `
			<p>Howdy <strong>${firstName}</strong>!</p>
			
			<p>I received the results from your CBC. We can now schedule a time to complete your I-9 verification. Section 1 must be completed on or before your hire date of <strong>${hireDate}</strong>. To schedule a time to come in, please use the following link:
			<a href="https://outlook.office.com/book/SchoolofLawHumanResources@tamucs.onmicrosoft.com/?ismsaljsauthenabled" target="_blank">
			HROE Onboarding Bookings</a></p>

			<p>We are located at 115 E 15th St Second Floor, Fort Worth, TX 76102</p>

			<p><a href="https://maps.app.goo.gl/buY7qDfPkMfdUpa1A" target="_blank">View on Google Maps</a></p>

			<p>You will receive a separate email from Perfect Compliance with instructions to complete Section 1 of Form I-9. To comply with Federal and State laws, you must complete Section 1 of Form I-9 before the start date of employment. You may not start working until this is completed. If you do not complete Section 1 of the Form I-9 by your hire date, your hire will be postponed.</p>

			<p>During your appointment, we will complete Section 2 of the Form I-9, for this you must bring original, unexpired documents to verify your identity and work authorization. Copies are not accepted. You can review the list of Acceptable Documents before you come so you can gather the documents needed to complete the Form I-9.</p>

			<p>If you are an International Student, please review the resources linked below to learn more about Guidelines for On-Campus Employment, including the steps needed to obtain a Social Security Number at F-1 On and Off Campus Employment. If you need your I-94 U.S. Arrival/Departure Record you can go to <a href="https://i94.cbp.dhs.gov/search/recent-search" target="_blank">i94.cbp.dhs.gov</a>.</p>

			<p>Thanks!</p>
		  `;
		}	
		if (emailType === "prospectiveWelcome") {
		  const subject = "Welcome to Texas A&M University - Next Steps";

		  // HTML body for on-screen preview (escaped <emp name>)
		  const htmlBody = `
			<p>Howdy <strong>&lt;emp name&gt;</strong>!</p>

			<p>Please provide your UIN and year of study (for example, 1L, 2L, 3L, LLM) to begin this process.</p>

			<p>The offer of employment you received is contingent upon successful completion of a criminal background check and the Employment Eligibility Verification Form (I-9). Please note that you should not begin working until you receive clearance that all necessary requirements have been completed.</p>

			<p>You will receive a few emails for the hire process. You will receive a prospective hire form to complete in the Laserfiche system. After that is completed, in the next day or so, you will receive a separate email from Sterling Background Check to complete a criminal background check. After that you receive an email from Perfect Compliance with detailed instructions to complete an electronic Form I-9. After you complete the electronic form, you will be able to come in person to complete your document verification.</p>

			<p>After you complete the form, we can schedule a time for you to come in and complete the in-person portion. Please review the List of Acceptable Documents (for example, a driver license with a social security card or a US Passport) before you come so you can gather the documents needed to complete the Form I-9. Please remember that you need to present original documents, or receipts in case your documents have been lost, stolen, or damaged.</p>

			<p>Once the I-9 and criminal background check are completed you will be entered into Workday. You will receive emails to allow you to complete on-boarding forms in Workday.</p>

			<p>You will also be responsible for completing mandatory training in the TrainTraq system. These trainings need to be completed at the beginning of your employment.</p>

			<p>After completing your on-boarding requirements, you will use Workday to submit timesheets. You can go to Pay Dates, Pay Schedules, and Calendars to find a list of bi-weekly pay dates and timesheet deadlines.</p>

			<p>Keep an eye out for the Prospective Hire Form, as none of the other processes begin until that is submitted.</p>

			<p>Thanks!</p>
		  `;

		  // Put the formatted HTML into the preview box
		  const out = document.getElementById('email-message');
		  out.innerHTML = htmlBody;
		  document.getElementById('email-output').classList.remove('hidden');

		  // Stash a plain-text version for mailto (mailto can't use HTML)
		  const plainTextBody =
		`Howdy <emp name>!

		Please provide your UIN and year of study (for example, 1L, 2L, 3L, LLM) to begin this process.

		The offer of employment you received is contingent upon successful completion of a criminal background check and the Employment Eligibility Verification Form (I-9). Please note that you should not begin working until you receive clearance that all necessary requirements have been completed.

		You will receive a few emails for the hire process. You will receive a prospective hire form to complete in the Laserfiche system. After that is completed, in the next day or so, you will receive a separate email from Sterling Background Check to complete a criminal background check. After that you receive an email from Perfect Compliance with detailed instructions to complete an electronic Form I-9. After you complete the electronic form, you will be able to come in person to complete your document verification.

		After you complete the form, we can schedule a time for you to come in and complete the in-person portion. Please review the List of Acceptable Documents (for example, a driver license with a social security card or a US Passport) before you come so you can gather the documents needed to complete the Form I-9. Please remember that you need to present original documents, or receipts in case your documents have been lost, stolen, or damaged.

		Once the I-9 and criminal background check are completed you will be entered into Workday. You will receive emails to allow you to complete on-boarding forms in Workday.

		You will also be responsible for completing mandatory training in the TrainTraq system. These trainings need to be completed at the beginning of your employment.

		After completing your on-boarding requirements, you will use Workday to submit timesheets. You can go to Pay Dates, Pay Schedules, and Calendars to find a list of bi-weekly pay dates and timesheet deadlines.

		Keep an eye out for the Prospective Hire Form, as none of the other processes begin until that is submitted.

		Thanks!`;

		  // Save these so the “Open in Email Client” button can use them
		  out.dataset.subject = subject;
		  out.dataset.plain = plainTextBody;

		  return; // done
		}
		
		// When generating email
		document.getElementById('email-message').innerHTML = template;
		document.getElementById('email-output').classList.remove('hidden');
	});

function updateOverdueCounts() {
  const today = new Date().toISOString().split('T')[0];
  onboardings.forEach(o => {
    const tasks = getFilteredTasks(o.hireCategory, o.hireType);
    let overdue = 0;

    tasks.forEach(task => {
      const due = calculateDueDate(task, o.startDate, o.requestReceived);
      const completed = o.taskCompletionDates && o.taskCompletionDates[task];
      if (due && !completed && due < today) overdue++;
    });

    o.overdueTasks = overdue;
  });
}


function exportData() {
  const data = { onboardings, exportDate: new Date().toISOString(), version: "1.0" };
  const str = JSON.stringify(data, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `hr-onboarding-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function validateGithubConfig() {
  return GITHUB_CONFIG.token &&
         GITHUB_CONFIG.token !== 'YOUR_GITHUB_TOKEN_HERE' &&
         GITHUB_CONFIG.owner &&
         GITHUB_CONFIG.owner !== 'YOUR_GITHUB_USERNAME' &&
         GITHUB_CONFIG.repo &&
         GITHUB_CONFIG.repo !== 'YOUR_REPO_NAME';
}

function saveData(retryCount = 0) {
  if (!validateGithubConfig()) {
    showConfirmDialog('GitHub configuration is incomplete.', () => {});
    return;
  }
  if (isSaving) return;
  isSaving = true;

  const data = { onboardings, exportDate: new Date().toISOString(), version: "1.0" };
  const content = JSON.stringify(data, null, 2);
  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.filePath}`;
  const payload = {
    message: `Update onboarding data - ${new Date().toISOString()}`,
    content: encodedContent,
    branch: GITHUB_CONFIG.branch
  };
  if (githubFileSha) payload.sha = githubFileSha;

  showToast('Saving to GitHub...', 5000);

  fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(err => {
        throw { status: response.status, message: err.message || 'Failed to save' };
      });
    }
    return response.json();
  })
  .then(result => {
    githubFileSha = result.content.sha;
    isSaving = false;
    showToast('✓ Data saved to GitHub');
  })
  .catch(err => {
    isSaving = false;
    if (err.message && err.message.includes('does not match') && retryCount === 0) {
      showToast('Syncing...', 3000);
      fetch(url + `?ref=${GITHUB_CONFIG.branch}`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
      .then(response => response.json())
      .then(fileData => {
        if (fileData && fileData.sha) {
          githubFileSha = fileData.sha;
          saveData(1);
        }
      })
      .catch(() => {
        showConfirmDialog(`Failed to save. Click "Load from GitHub" first.`, () => {});
      });
    } else {
      showConfirmDialog(`Failed to save: ${err.message}`, () => {});
    }
  });
}

function autoSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveData(), 1000);
}

function loadDataFromServer() {
  if (!validateGithubConfig()) {
    showToast('⚠️ GitHub not configured');
    return;
  }
  const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.filePath}?ref=${GITHUB_CONFIG.branch}`;
  showToast('Loading from GitHub...', 3000);

  fetch(url, {
    headers: {
      'Authorization': `Bearer ${GITHUB_CONFIG.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  })
  .then(response => {
    if (!response.ok) {
      if (response.status === 404) {
        showToast('⚠️ No data file found');
        return null;
      }
      throw new Error(`API error: ${response.status}`);
    }
    return response.json();
  })
  .then(fileData => {
    if (fileData && fileData.content) {
      githubFileSha = fileData.sha;
      const content = decodeURIComponent(escape(atob(fileData.content)));
      const data = JSON.parse(content);
      if (data && data.onboardings && Array.isArray(data.onboardings)) {
        onboardings = data.onboardings;
		updateOverdueCounts();
        applyFilters();
        updateStats();
		updateEmailEmployeeList();
        showToast(`✓ Loaded ${onboardings.length} record${onboardings.length !== 1 ? 's' : ''}`);
      }
    }
  })
  .catch(err => {
    showToast(`❌ Could not load: ${err.message}`);
  });
}

function importData(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    try {
      const importedData = JSON.parse(text);
      if (importedData.onboardings && Array.isArray(importedData.onboardings)) {
        onboardings = importedData.onboardings;
        document.getElementById('filter-hire-type').value = '';
        document.getElementById('filter-status').value = '';
        applyFilters();
        updateStats();
        showConfirmDialog(`Imported ${onboardings.length} record${onboardings.length !== 1 ? 's' : ''}!`, () => {});
      } else {
        showConfirmDialog('Invalid file format.', () => {});
      }
    } catch (err) {
      showConfirmDialog('Error parsing JSON.', () => {});
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function showConfirmDialog(message, callback) {
  document.getElementById('confirm-message').textContent = message;
  const modal = document.getElementById('confirm-modal');
  modal.classList.remove('hidden');
  document.getElementById('confirm-ok').onclick = () => {
    modal.classList.add('hidden');
    if (callback) callback();
  };
  document.getElementById('confirm-cancel').onclick = () => {
    modal.classList.add('hidden');
  };
}

// Utility: create small bar chart with tooltips
function renderSmallChart(containerId, dataMap, colorClass = 'bg-tamu-maroon', unitLabel = '%') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  const total = Object.values(dataMap).reduce((a, b) => a + b, 0);
  if (!total) {
    el.innerHTML = `<div class="text-xs text-gray-400 text-center">—</div>`;
    return;
  }

  Object.entries(dataMap).forEach(([label, value]) => {
    const percent = ((value / total) * 100).toFixed(1);
    const barWrap = document.createElement('div');
    barWrap.className = 'relative w-full h-2 bg-gray-100 rounded-full mb-1 group';

    const bar = document.createElement('div');
    bar.className = `absolute left-0 top-0 h-2 rounded-full transition-all duration-300 ease-out ${colorClass}`;
    bar.style.width = `${percent}%`;

    const tooltip = document.createElement('div');
    tooltip.className = 'absolute opacity-0 group-hover:opacity-100 transition pointer-events-none -top-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap';
    tooltip.textContent = `${label}: ${percent}${unitLabel}`;

    barWrap.appendChild(bar);
    barWrap.appendChild(tooltip);
    el.appendChild(barWrap);
  });
}

// Render both right-side charts
function updateInsightCharts() {
  const TYPE_ORDER = ["Student", "Staff", "Faculty", "Unspecified"];
  const CATEGORY_ORDER = ["Newhire", "Rehire", "Addjob", "Transfer", "Unspecified"];

  // --- TYPE COUNTS ---
  const typeCounts = onboardings.reduce((acc, o) => {
    const val = (o.hireType || 'Unspecified').trim().toLowerCase();
    let t = 'Unspecified';
    if (val.includes('student')) t = 'Student';
    else if (val.includes('staff')) t = 'Staff';
    else if (val.includes('faculty')) t = 'Faculty';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  // --- CATEGORY COUNTS ---
  const categoryCounts = onboardings.reduce((acc, o) => {
    const val = (o.hireCategory || 'Unspecified').trim().toLowerCase();
    let c = 'Unspecified';
    if (val.includes('new')) c = 'Newhire';
    else if (val.includes('re')) c = 'Rehire';
    else if (val.includes('add')) c = 'Addjob';
    else if (val.includes('trans')) c = 'Transfer';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  // --- PIE CHARTS ---
  renderPieChart('chart-type-pie', typeCounts, TYPE_ORDER, ['#500000','#7d2926','#a15247','#c1796d']);
  renderPieChart('chart-category-pie', categoryCounts, CATEGORY_ORDER, ['#2563eb','#3b82f6','#60a5fa','#93c5fd']);

  // --- AVERAGE COMPLETION DAYS ---
  const sum = {}, cnt = {};
  onboardings.forEach(o => {
    if (o.status === 'completed' && o.requestReceived && o.startDate) {
      const days = (new Date(o.startDate) - new Date(o.requestReceived)) / (1000*60*60*24);
      const t = o.hireType || 'Unspecified';
      const c = o.hireCategory || 'Unspecified';
      sum[t] = (sum[t]||0) + days; cnt[t]=(cnt[t]||0)+1;
      sum[c] = (sum[c]||0) + days; cnt[c]=(cnt[c]||0)+1;
    }
  });
  const avgDays = (keys) => keys.reduce((acc,k)=>{acc[k]=cnt[k]?sum[k]/cnt[k]:0;return acc;}, {});
  const avgType = avgDays(TYPE_ORDER);
  const avgCat = avgDays(CATEGORY_ORDER);

  renderAvgDaysChart('chart-type-bar', avgType, TYPE_ORDER, 'bg-tamu-maroon');
  renderAvgDaysChart('chart-category-bar', avgCat, CATEGORY_ORDER, 'bg-blue-500');

  // --- Legends ---
	document.getElementById('type-summary-legend').textContent =
	  `Total Type Records: ${Object.values(typeCounts).reduce((a,b)=>a+b,0)}`;
	document.getElementById('category-summary-legend').textContent =
	  `Total Category Records: ${Object.values(categoryCounts).reduce((a,b)=>a+b,0)}`;
	
	chartsAnimated = true;
}
