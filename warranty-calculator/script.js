/**
 * Warranty Calculator
 * Single-file vanilla JS — no dependencies.
 */

'use strict';

// ─── Constants ───────────────────────────────────────────────────
const STORAGE_KEY = 'warranty_custom_buttons';
const DEFAULT_PRESETS = [6];

// ─── State ───────────────────────────────────────────────────────
let selectedMonths = null; // currently highlighted quick button value

// ─── DOM refs ────────────────────────────────────────────────────
const purchaseDateInput  = document.getElementById('purchase-date');       // text input
const purchaseDateNative = document.getElementById('purchase-date-native'); // hidden date picker
const warrantyMonthInput = document.getElementById('warranty-months');
const quickButtonsEl     = document.getElementById('quick-buttons');
const btnCalculate       = document.getElementById('btn-calculate');
const resultEl           = document.getElementById('result');
const resultExpiryLabel  = document.getElementById('result-expiry-label');
const resultExpiryValue  = document.getElementById('result-expiry-value');
const resultDaysLabel    = document.getElementById('result-days-label');
const resultDaysValue    = document.getElementById('result-days-value');
const dialogOverlay      = document.getElementById('dialog-overlay');
const dialogInput        = document.getElementById('dialog-input');
const dialogConfirm      = document.getElementById('dialog-confirm');
const dialogCancel       = document.getElementById('dialog-cancel');

// ─── Date Utilities ───────────────────────────────────────────────

/**
 * Format a Date as "29 June 2027" — clear and unambiguous.
 */
function formatDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Add N calendar months to a date, handling end-of-month correctly.
 * e.g. Jan 31 + 1 month → Feb 28 (or 29 in leap year)
 */
function addMonths(date, months) {
  const result = new Date(date);
  const originalDay = date.getDate();
  result.setMonth(result.getMonth() + months);

  // If the day overflowed (e.g. March 31 + 1 → May 1 instead of April 30),
  // step back to the last day of the intended month.
  if (result.getDate() !== originalDay) {
    result.setDate(0); // last day of previous month
  }
  return result;
}

/**
 * Difference in full calendar days between two dates (date2 - date1).
 */
function daysBetween(date1, date2) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

// ─── Custom Button Storage ────────────────────────────────────────

function loadCustomButtons() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomButtons(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function getCustomButtons() {
  return loadCustomButtons();
}

function addCustomButton(months) {
  const list = loadCustomButtons();
  if (!list.includes(months)) {
    list.push(months);
    saveCustomButtons(list);
  }
}

function removeCustomButton(months) {
  const list = loadCustomButtons().filter(m => m !== months);
  saveCustomButtons(list);
}

// ─── UI: Render Quick Buttons ─────────────────────────────────────

function renderQuickButtons() {
  const custom = loadCustomButtons();
  quickButtonsEl.innerHTML = '';

  // Combined list: defaults + custom (sorted combined for display order)
  // Keep defaults first, then custom in order added.
  const allButtons = [
    ...DEFAULT_PRESETS.map(m => ({ months: m, custom: false })),
    ...custom.map(m => ({ months: m, custom: true })),
  ];

  allButtons.forEach(({ months, custom }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-quick' + (custom ? ' btn-quick--custom' : '');
    btn.textContent = months;
    btn.setAttribute('aria-label', `${months} months`);
    btn.dataset.months = months;

    if (months === selectedMonths) {
      btn.classList.add('is-active');
    }

    if (custom) {
      // Long-press (600ms) opens delete confirmation
      let pressTimer = null;
      const startPress = () => {
        pressTimer = setTimeout(() => {
          pressTimer = null;
          openDeleteDialog(months);
        }, 600);
      };
      const cancelPress = () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      };
      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('touchstart', startPress, { passive: true });
      btn.addEventListener('mouseup', cancelPress);
      btn.addEventListener('mouseleave', cancelPress);
      btn.addEventListener('touchend', cancelPress);
      btn.addEventListener('touchcancel', cancelPress);
    }

    btn.addEventListener('click', () => selectQuickButton(months));
    quickButtonsEl.appendChild(btn);
  });

  // "+" add button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add';
  addBtn.textContent = '+';
  addBtn.setAttribute('aria-label', 'Add custom warranty duration');
  addBtn.addEventListener('click', openDialog);
  quickButtonsEl.appendChild(addBtn);
}

function selectQuickButton(months) {
  selectedMonths = months;
  warrantyMonthInput.value = months;
  renderQuickButtons();
}

// ─── Dialog ───────────────────────────────────────────────────────

function openDialog() {
  dialogInput.value = '';
  dialogOverlay.hidden = false;
  dialogInput.focus();
}

function closeDialog() {
  dialogOverlay.hidden = true;
}

function confirmDialog() {
  const val = parseInt(dialogInput.value, 10);
  if (!val || val < 1 || val > 600) {
    dialogInput.focus();
    dialogInput.style.borderColor = 'var(--expired)';
    setTimeout(() => { dialogInput.style.borderColor = ''; }, 1200);
    return;
  }

  // Don't add if already in defaults or custom
  const allExisting = [
    ...DEFAULT_PRESETS,
    ...loadCustomButtons(),
  ];
  if (!allExisting.includes(val)) {
    addCustomButton(val);
  }

  selectQuickButton(val);
  closeDialog();
}

// ─── Delete Confirmation Dialog ───────────────────────────────────

function openDeleteDialog(months) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="dialog">
      <h2 class="dialog-title">Remove Button</h2>
      <p class="dialog-desc">Remove the <strong>${months}</strong> month button from quick select?</p>
      <div class="dialog-actions">
        <button class="btn-secondary" id="del-cancel">Cancel</button>
        <button class="btn-danger"   id="del-confirm">Remove</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);

  overlay.querySelector('#del-cancel').addEventListener('click', close);
  overlay.querySelector('#del-confirm').addEventListener('click', () => {
    removeCustomButton(months);
    if (selectedMonths === months) {
      selectedMonths = null;
      warrantyMonthInput.value = '';
    }
    renderQuickButtons();
    close();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#del-cancel').focus();
}

dialogConfirm.addEventListener('click', confirmDialog);
dialogCancel.addEventListener('click', closeDialog);

dialogOverlay.addEventListener('click', (e) => {
  if (e.target === dialogOverlay) closeDialog();
});

dialogInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') confirmDialog();
  if (e.key === 'Escape') closeDialog();
});


// ─── Date Field: text input auto-format & native picker sync ─────

// Auto-format as user types: insert slashes after DD and MM
purchaseDateInput.addEventListener('input', () => {
  let v = purchaseDateInput.value.replace(/\D/g, ''); // digits only
  if (v.length > 2)  v = v.slice(0,2) + '/' + v.slice(2);
  if (v.length > 5)  v = v.slice(0,5) + '/' + v.slice(5,9);
  purchaseDateInput.value = v;

  // Sync to native picker when fully entered
  const parts = v.split('/');
  if (parts.length === 3 && parts[2].length === 4) {
    const [dd, mm, yyyy] = parts;
    purchaseDateNative.value = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
});

// When native picker changes (user picked a date from calendar icon),
// write it back to the visible text input
purchaseDateNative.addEventListener('change', () => {
  const val = purchaseDateNative.value; // YYYY-MM-DD
  if (!val) return;
  const [yyyy, mm, dd] = val.split('-');
  purchaseDateInput.value = `${dd}/${mm}/${yyyy}`;
});

// ─── Sync active state when user types months manually ───────────

warrantyMonthInput.addEventListener('input', () => {
  const val = parseInt(warrantyMonthInput.value, 10);
  selectedMonths = (!isNaN(val) && val > 0) ? val : null;
  renderQuickButtons();
});

// ─── Calculation ─────────────────────────────────────────────────

function calculate() {
  const purchaseDateStr = purchaseDateInput.value;
  const months = parseInt(warrantyMonthInput.value, 10);

  if (!purchaseDateStr) {
    purchaseDateInput.focus();
    shake(purchaseDateInput);
    return;
  }

  if (!months || months < 1) {
    warrantyMonthInput.focus();
    shake(warrantyMonthInput);
    return;
  }

  // Parse local date from DD/MM/YYYY
  const parts = purchaseDateStr.replace(/\s/g, '').split('/');
  if (parts.length !== 3) { shake(purchaseDateInput); purchaseDateInput.focus(); return; }
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year || year < 1900 || year > 2200) {
    shake(purchaseDateInput); purchaseDateInput.focus(); return;
  }
  const purchaseDate = new Date(year, month - 1, day);
  const expiryDate = addMonths(purchaseDate, months);

  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysLeft = daysBetween(todayNorm, expiryDate);

  showResult(expiryDate, daysLeft);
}

function showResult(expiryDate, daysLeft) {
  const expired = daysLeft < 0;
  const today = daysLeft === 0;

  resultEl.hidden = false;
  resultEl.classList.toggle('is-active', !expired);
  resultEl.classList.toggle('is-expired', expired);

  resultExpiryLabel.textContent = expired ? 'Expired On' : 'Warranty Expires';
  resultExpiryValue.textContent = formatDate(expiryDate);

  if (today) {
    resultDaysLabel.textContent = 'Status';
    resultDaysValue.textContent = 'Expires Today';
  } else if (expired) {
    resultDaysLabel.textContent = 'Expired';
    resultDaysValue.textContent = `${Math.abs(daysLeft).toLocaleString()} Day${Math.abs(daysLeft) === 1 ? '' : 's'} Ago`;
  } else {
    resultDaysLabel.textContent = 'Days Remaining';
    resultDaysValue.textContent = `${daysLeft.toLocaleString()} Day${daysLeft === 1 ? '' : 's'}`;
  }

  // Scroll into view on mobile
  resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Micro-shake for invalid input ───────────────────────────────

function shake(el) {
  el.style.transition = 'transform 0.05s';
  const steps = [6, -5, 4, -3, 2, 0];
  let i = 0;
  const go = () => {
    if (i < steps.length) {
      el.style.transform = `translateX(${steps[i]}px)`;
      el.style.borderColor = 'var(--expired)';
      i++;
      setTimeout(go, 50);
    } else {
      el.style.transform = '';
      setTimeout(() => { el.style.borderColor = ''; }, 800);
    }
  };
  go();
}

// ─── Calculate Button & Enter Key ────────────────────────────────

btnCalculate.addEventListener('click', calculate);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && dialogOverlay.hidden) {
    calculate();
  }
});

// ─── Init ─────────────────────────────────────────────────────────

function init() {
  // Set today as default purchase date
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  purchaseDateInput.value = `${dd}/${mm}/${yyyy}`;      // display as DD/MM/YYYY
  purchaseDateNative.value = `${yyyy}-${mm}-${dd}`;     // keep native in sync

  renderQuickButtons();
}

init();

// ─── Service Worker Registration ─────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // SW registration failure is non-fatal; app still works.
    });
  });
}
