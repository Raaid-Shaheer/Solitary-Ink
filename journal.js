// Journal view: daily entries in "Summary" or "Hour Breakdown" mode.

const HOUR_LABELS = [
  '6 AM','7 AM','8 AM','9 AM','10 AM','11 AM','12 PM',
  '1 PM','2 PM','3 PM','4 PM','5 PM','6 PM','7 PM','8 PM','9 PM','10 PM','11 PM'
];

const Journal = (() => {
  let currentDate = new Date();
  let currentEntry = null;
  let saveTimer = null;
  let activityOptions = [];

  async function loadActivityOptions() {
    activityOptions = await DB.getAll('activityOptions');
    activityOptions.sort((a, b) => a.label.localeCompare(b.label));
  }

  function formatDisplayDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  async function loadEntry(dateKey) {
    const existing = await DB.get('journalEntries', dateKey);
    return existing || { date: dateKey, mode: 'summary', summary: '', hours: {} };
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await DB.put('journalEntries', currentEntry);
      updateDaysJournaled();
    }, 400);
  }

  async function saveNow(showConfirm) {
    clearTimeout(saveTimer);
    await DB.put('journalEntries', currentEntry);
    await updateDaysJournaled();
    if (showConfirm) {
      document.querySelectorAll('.save-entry-btn').forEach(btn => {
        const original = btn.textContent;
        btn.textContent = 'Saved';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
      });
      document.activeElement && document.activeElement.blur();
    }
  }

  async function updateDaysJournaled() {
    const all = await DB.getAll('journalEntries');
    const count = all.filter(e =>
      (e.summary && e.summary.trim()) ||
      (e.hours && Object.values(e.hours).some(v => v && v.trim()))
    ).length;
    const el = document.getElementById('days-journaled');
    if (el) el.textContent = `${count} day${count === 1 ? '' : 's'} journaled`;
  }

  function switchTab(mode) {
    currentEntry.mode = mode;
    document.getElementById('tab-summary').classList.toggle('active', mode === 'summary');
    document.getElementById('tab-summary').setAttribute('aria-selected', mode === 'summary');
    document.getElementById('tab-hourly').classList.toggle('active', mode === 'hourly');
    document.getElementById('tab-hourly').setAttribute('aria-selected', mode === 'hourly');
    document.getElementById('view-summary').classList.toggle('hidden', mode !== 'summary');
    document.getElementById('view-hourly').classList.toggle('hidden', mode !== 'hourly');
    scheduleSave();
  }

  function renderHourBlocks() {
    return HOUR_LABELS.map((label) => {
      const val = currentEntry.hours[label] || '';
      const filled = val.trim().length > 0;
      const knownLabels = new Set(activityOptions.map(o => o.label));
      const optionsHTML = activityOptions.map(o =>
        `<option value="${o.label}" ${o.label === val ? 'selected' : ''}>${o.label}</option>`
      ).join('');
      const customOption = (val && !knownLabels.has(val))
        ? `<option value="${val}" selected>${val}</option>` : '';
      return `
        <div class="hour-block-container ${filled ? 'filled' : ''} flex items-start">
          <div class="hour-node"></div>
          <div class="hour-label font-label-sm text-label-sm pt-1">${label}</div>
          <div class="flex-grow pt-0">
            <select class="hour-block-input hour-block-select" data-hour="${label}">
              <option value="">What's happening?</option>
              ${customOption}
              ${optionsHTML}
            </select>
          </div>
        </div>`;
    }).join('');
  }

  async function render() {
    const dateKey = todayKey(currentDate);
    currentEntry = await loadEntry(dateKey);
    await loadActivityOptions();

    const app = document.getElementById('app-content');
    app.innerHTML = `
      <div class="mb-section-margin flex flex-col items-center md:items-start">
        <div class="flex items-center gap-4 mb-2">
          <h2 class="font-display-date text-display-date text-on-surface">${formatDisplayDate(currentDate)}</h2>
          <div class="flex items-center gap-1">
            <button id="prev-day" aria-label="Previous day" class="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low">
              <span class="material-symbols-outlined" style="font-size:18px;">chevron_left</span>
            </button>
            <button id="today-btn" aria-label="Jump to a date" class="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low relative">
              <span class="material-symbols-outlined" style="font-size:20px;">calendar_month</span>
              <input type="date" id="date-jump-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value="${dateKey}"/>
            </button>
            <button id="next-day" aria-label="Next day" class="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low">
              <span class="material-symbols-outlined" style="font-size:18px;">chevron_right</span>
            </button>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button id="days-journaled" class="font-label-sm text-label-sm text-outline tracking-wider uppercase hover:text-primary transition-colors">&nbsp;</button>
          ${dateKey !== todayKey() ? `<button id="jump-today-link" class="font-label-sm text-label-sm text-primary/70 hover:text-primary tracking-wider uppercase">Today</button>` : ''}
        </div>
      </div>

      <div class="flex justify-center md:justify-start mb-section-margin">
        <div class="segmented-control" role="tablist">
          <button aria-selected="true" class="segmented-item ${currentEntry.mode === 'summary' ? 'active' : ''}" id="tab-summary" role="tab">Summary</button>
          <button aria-selected="false" class="segmented-item ${currentEntry.mode === 'hourly' ? 'active' : ''}" id="tab-hourly" role="tab">Hour Breakdown</button>
        </div>
      </div>

      <div class="${currentEntry.mode === 'summary' ? '' : 'hidden'}" id="view-summary">
        <textarea class="journal-input" id="summary-input" placeholder="How was your day?">${currentEntry.summary || ''}</textarea>
        <div class="flex justify-end mt-4">
          <button class="save-entry-btn px-6 py-2 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-surface-bright transition-colors active:scale-95">Save</button>
        </div>
      </div>

      <div class="${currentEntry.mode === 'hourly' ? '' : 'hidden'}" id="view-hourly">
        <div class="flex justify-end mb-4">
          <button id="manage-activities-btn" class="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm uppercase tracking-wider">
            <span class="material-symbols-outlined" style="font-size:16px;">tune</span> Manage Activities
          </button>
        </div>
        <div class="space-y-6 font-body-md text-body-md">
          ${renderHourBlocks()}
        </div>
        <div class="flex justify-end mt-6">
          <button class="save-entry-btn px-6 py-2 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm uppercase tracking-wider hover:bg-surface-bright transition-colors active:scale-95">Save</button>
        </div>
      </div>
    `;

    document.getElementById('tab-summary').addEventListener('click', () => switchTab('summary'));
    document.getElementById('tab-hourly').addEventListener('click', () => switchTab('hourly'));

    document.getElementById('summary-input').addEventListener('input', (e) => {
      currentEntry.summary = e.target.value;
      scheduleSave();
    });

    document.querySelectorAll('.hour-block-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const hour = e.target.dataset.hour;
        currentEntry.hours[hour] = e.target.value;
        e.target.closest('.hour-block-container').classList.toggle('filled', e.target.value.trim().length > 0);
        scheduleSave();
      });
    });

    const manageBtn = document.getElementById('manage-activities-btn');
    if (manageBtn) manageBtn.addEventListener('click', openManageActivities);

    document.getElementById('prev-day').addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() - 1);
      render();
    });
    document.getElementById('next-day').addEventListener('click', () => {
      currentDate.setDate(currentDate.getDate() + 1);
      render();
    });
    document.getElementById('date-jump-input').addEventListener('change', (e) => {
      if (!e.target.value) return;
      const [y, m, d] = e.target.value.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
      render();
    });

    document.getElementById('days-journaled').addEventListener('click', openArchive);
    const jumpTodayLink = document.getElementById('jump-today-link');
    if (jumpTodayLink) jumpTodayLink.addEventListener('click', () => { currentDate = new Date(); render(); });

    document.querySelectorAll('.save-entry-btn').forEach(btn =>
      btn.addEventListener('click', () => saveNow(true)));

    updateDaysJournaled();
  }

  const ARCHIVE_PAGE_SIZE = 20;

  async function openArchive() {
    const all = await DB.getAll('journalEntries');
    const withContent = all
      .filter(e => (e.summary && e.summary.trim()) || (e.hours && Object.values(e.hours).some(v => v && v.trim())))
      .sort((a, b) => b.date.localeCompare(a.date));

    let visibleCount = ARCHIVE_PAGE_SIZE;

    const overlay = document.createElement('div');
    overlay.id = 'journal-archive-overlay';
    overlay.className = 'fixed inset-0 bg-background z-[90] flex flex-col';
    overlay.innerHTML = `
      <header class="flex justify-between items-center w-full px-container-padding h-16 max-w-max-width-content mx-auto w-full shrink-0">
        <button id="archive-close-btn" class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2">
          <span class="material-symbols-outlined">arrow_back</span>
          <span class="font-label-sm text-label-sm uppercase tracking-widest">Back</span>
        </button>
        <div class="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">Past Entries</div>
        <div class="w-10"></div>
      </header>
      <div class="flex-1 overflow-y-auto px-container-padding pb-24 max-w-max-width-content mx-auto w-full" id="archive-scroll">
        <div id="archive-list"></div>
        <button id="archive-load-more" class="hidden w-full mt-2 mb-6 py-3 rounded-full border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-label-sm text-label-sm uppercase tracking-wider">
          Load more
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    function entryButtonHTML(e) {
      const d = new Date(e.date + 'T00:00:00');
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const preview = (e.summary && e.summary.trim())
        ? e.summary.trim().slice(0, 90)
        : Object.entries(e.hours || {}).find(([, v]) => v && v.trim())?.[1]?.slice(0, 90) || '';
      return `
        <button data-date="${e.date}" class="archive-entry-btn w-full text-left bg-surface-container-low hover:bg-surface-container p-4 rounded-lg mb-3 transition-colors">
          <div class="flex justify-between items-baseline mb-1">
            <span class="font-body-lg text-body-lg text-primary">${label}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant/60">${e.mode === 'hourly' ? 'Hourly' : 'Summary'}</span>
          </div>
          <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2">${preview || '—'}</p>
        </button>`;
    }

    function renderPage() {
      const listEl = overlay.querySelector('#archive-list');
      const loadMoreBtn = overlay.querySelector('#archive-load-more');
      if (!withContent.length) {
        listEl.innerHTML = `<p class="font-body-md text-body-md text-on-surface-variant/60 mt-8 text-center">No past entries yet.</p>`;
        loadMoreBtn.classList.add('hidden');
        return;
      }
      const slice = withContent.slice(0, visibleCount);
      listEl.innerHTML = slice.map(entryButtonHTML).join('');
      listEl.querySelectorAll('.archive-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const [y, m, d] = btn.dataset.date.split('-').map(Number);
          currentDate = new Date(y, m - 1, d);
          overlay.remove();
          render();
        });
      });
      const remaining = withContent.length - visibleCount;
      loadMoreBtn.textContent = remaining > 0 ? `Load more (${remaining} left)` : 'Load more';
      loadMoreBtn.classList.toggle('hidden', remaining <= 0);
    }

    overlay.querySelector('#archive-load-more').addEventListener('click', () => {
      visibleCount += ARCHIVE_PAGE_SIZE;
      renderPage();
    });

    renderPage();
    overlay.querySelector('#archive-close-btn').addEventListener('click', () => overlay.remove());
  }

  async function openManageActivities() {
    let options = await DB.getAll('activityOptions');
    options.sort((a, b) => a.label.localeCompare(b.label));

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center';
    document.body.appendChild(overlay);

    function paint() {
      overlay.innerHTML = `
        <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col">
          <h3 class="font-headline-md text-headline-md text-on-surface mb-4">Manage Activities</h3>
          <div class="flex-1 overflow-y-auto space-y-2 mb-4">
            ${options.length ? options.map(o => `
              <div class="flex items-center justify-between bg-surface-container-lowest rounded-lg pl-3 pr-1 py-1">
                <span class="font-body-md text-body-md text-on-surface">${o.label}</span>
                <div class="flex gap-0.5">
                  <button class="edit-activity-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" data-id="${o.id}" title="Edit">
                    <span class="material-symbols-outlined" style="font-size:16px;">edit</span>
                  </button>
                  <button class="delete-activity-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" data-id="${o.id}" title="Delete">
                    <span class="material-symbols-outlined" style="font-size:16px;">close</span>
                  </button>
                </div>
              </div>`).join('') : `<p class="font-body-md text-body-md text-on-surface-variant/60">No activities yet.</p>`}
          </div>
          <button id="add-activity-btn" class="w-full mb-3 py-3 rounded-full border border-dashed border-outline-variant/40 text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm uppercase tracking-wider flex items-center justify-center gap-2">
            <span class="material-symbols-outlined" style="font-size:18px;">add</span> Add Activity
          </button>
          <button id="manage-close-btn" class="w-full px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">Close</button>
        </div>`;

      overlay.querySelector('#manage-close-btn').addEventListener('click', close);
      overlay.querySelector('#add-activity-btn').addEventListener('click', async () => {
        const values = await Modal.form({
          title: 'New Activity',
          fields: [{ key: 'label', label: 'Name', type: 'text', placeholder: 'e.g. Watched YouTube' }],
          submitLabel: 'Add'
        });
        if (!values || !values.label.trim()) return;
        await DB.put('activityOptions', { id: uid(), label: values.label.trim() });
        options = await DB.getAll('activityOptions');
        options.sort((a, b) => a.label.localeCompare(b.label));
        paint();
      });
      overlay.querySelectorAll('.edit-activity-btn').forEach(btn => btn.addEventListener('click', async () => {
        const opt = options.find(o => o.id === btn.dataset.id);
        const values = await Modal.form({
          title: 'Edit Activity',
          fields: [{ key: 'label', label: 'Name', type: 'text', value: opt.label }],
          submitLabel: 'Save'
        });
        if (!values || !values.label.trim()) return;
        opt.label = values.label.trim();
        await DB.put('activityOptions', opt);
        options = await DB.getAll('activityOptions');
        options.sort((a, b) => a.label.localeCompare(b.label));
        paint();
      }));
      overlay.querySelectorAll('.delete-activity-btn').forEach(btn => btn.addEventListener('click', async () => {
        const opt = options.find(o => o.id === btn.dataset.id);
        const ok = await Modal.confirmDialog({
          title: `Delete "${opt.label}"?`,
          message: 'This removes it from the dropdown. Hours already set to it keep the text.',
          confirmLabel: 'Delete'
        });
        if (!ok) return;
        await DB.delete('activityOptions', opt.id);
        options = options.filter(o => o.id !== opt.id);
        paint();
      }));
    }

    function close() {
      overlay.remove();
      render();
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    paint();
  }

  return { render };
})();
