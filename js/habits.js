// Habit tracker: daily vs weekly goals, persistent increment/decrement counters.

const Habits = (() => {
  let currentFreq = 'daily';
  let habits = [];

  async function loadHabits() {
    habits = await DB.getAll('habits');
  }

  function daysSince(iso) {
    if (!iso) return null;
    const diffMs = Date.now() - new Date(iso).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  function triggerPulse(el) {
    el.classList.remove('animate-tick');
    void el.offsetWidth;
    el.classList.add('animate-tick');
  }

  function renderHabitCard(h) {
    return `
      <div class="bg-surface-container rounded-xl p-4 flex flex-col gap-4" data-habit-id="${h.id}">
        <div class="flex justify-between items-start gap-2">
          <div class="flex flex-col min-w-0">
            <span class="font-headline-md text-headline-md text-on-surface ink-underline mb-1 truncate">${h.name}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Target: ${h.target ?? '—'}</span>
          </div>
          <div class="flex gap-0.5 shrink-0 -mr-1">
            <button class="history-habit-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" title="History" data-id="${h.id}">
              <span class="material-symbols-outlined" style="font-size:18px;">trending_up</span>
            </button>
            <button class="edit-habit-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" title="Edit" data-id="${h.id}">
              <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
            </button>
            <button class="reset-habit-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" title="Reset" data-id="${h.id}">
              <span class="material-symbols-outlined" style="font-size:18px;">restart_alt</span>
            </button>
            <button class="delete-habit-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" title="Delete" data-id="${h.id}">
              <span class="material-symbols-outlined" style="font-size:18px;">close</span>
            </button>
          </div>
        </div>
        <div class="flex justify-end items-center gap-4">
          <span class="font-body-lg text-body-lg text-primary-fixed-dim habit-counter" data-id="${h.id}">${h.count}</span>
          <div class="flex gap-2 bg-surface-container-lowest p-1 rounded-full border border-outline-variant/10 shadow-inner">
            <button class="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors active:scale-95 btn-decrement" data-id="${h.id}">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <button class="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container-high text-primary hover:bg-surface-bright transition-colors active:scale-95 btn-increment" data-id="${h.id}">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  function lastResetLabel() {
    const resets = habits.map(h => daysSince(h.lastResetAt)).filter(d => d !== null);
    if (!resets.length) return 'No resets yet';
    const min = Math.min(...resets);
    return `${min} day${min === 1 ? '' : 's'} since last reset`;
  }

  async function render() {
    await loadHabits();
    const filtered = habits.filter(h => h.frequency === currentFreq);

    const app = document.getElementById('app-content');
    app.innerHTML = `
      <div class="mb-section-margin flex flex-col items-center text-center">
        <h2 class="font-headline-lg text-headline-lg text-on-surface mb-4">Intentional Tracking</h2>
        <div class="segmented-control" role="tablist">
          <button class="segmented-item ${currentFreq === 'daily' ? 'active' : ''}" id="tab-daily">Daily</button>
          <button class="segmented-item ${currentFreq === 'weekly' ? 'active' : ''}" id="tab-weekly">Weekly</button>
        </div>
      </div>

      <div class="space-y-4" id="habit-list">
        ${filtered.length ? filtered.map(renderHabitCard).join('') : `
          <div class="empty-state">
            <p class="font-headline-md text-headline-md mb-2">Nothing planted yet</p>
            <p class="font-body-md text-body-md">Add a ${currentFreq} habit below to start tracking.</p>
          </div>`}
      </div>

      <button id="add-habit-btn" class="w-full mt-element-gap border border-dashed border-outline-variant/40 rounded-xl p-4 flex items-center justify-center gap-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all active:scale-[0.98] duration-200">
        <span class="material-symbols-outlined">add_circle</span>
        <span class="font-body-md text-body-md">Sow a new habit</span>
      </button>

      <div class="mt-section-margin flex flex-col items-center gap-4">
        <p class="font-label-sm text-label-sm text-outline tracking-wider uppercase">${lastResetLabel()}</p>
        <button id="reset-all-btn" class="px-6 py-2 rounded-full border border-error/20 text-error hover:bg-error/10 transition-colors font-label-sm text-label-sm active:scale-95">
          Reset All
        </button>
      </div>
    `;

    document.getElementById('tab-daily').addEventListener('click', () => { currentFreq = 'daily'; render(); });
    document.getElementById('tab-weekly').addEventListener('click', () => { currentFreq = 'weekly'; render(); });
    document.getElementById('add-habit-btn').addEventListener('click', addHabitFlow);
    document.getElementById('reset-all-btn').addEventListener('click', resetAllFlow);

    document.querySelectorAll('.btn-increment').forEach(btn =>
      btn.addEventListener('click', (e) => changeCount(e.currentTarget.dataset.id, 1, e.currentTarget)));
    document.querySelectorAll('.btn-decrement').forEach(btn =>
      btn.addEventListener('click', (e) => changeCount(e.currentTarget.dataset.id, -1, e.currentTarget)));
    document.querySelectorAll('.reset-habit-btn').forEach(btn =>
      btn.addEventListener('click', (e) => resetOne(e.currentTarget.dataset.id)));
    document.querySelectorAll('.delete-habit-btn').forEach(btn =>
      btn.addEventListener('click', (e) => deleteHabit(e.currentTarget.dataset.id)));
    document.querySelectorAll('.edit-habit-btn').forEach(btn =>
      btn.addEventListener('click', (e) => editHabitFlow(e.currentTarget.dataset.id)));
    document.querySelectorAll('.history-habit-btn').forEach(btn =>
      btn.addEventListener('click', (e) => openHistory(e.currentTarget.dataset.id)));
  }

  function openHistory(id) {
    const h = habits.find(x => x.id === id);
    if (!h) return;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[95] flex items-end md:items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-1">${h.name}</h3>
        <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-6">Last 14 days</p>
        ${renderSparkline(h.history, 14, h.target)}
        <button id="history-close-btn" class="w-full mt-8 px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">Close</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#history-close-btn').addEventListener('click', () => overlay.remove());
  }

  async function editHabitFlow(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    const values = await Modal.form({
      title: 'Edit Habit',
      fields: [
        { key: 'name', label: 'Habit name', type: 'text', value: habit.name },
        { key: 'target', label: 'Target (optional)', type: 'number', value: habit.target ?? '' }
      ],
      submitLabel: 'Save'
    });
    if (!values || !values.name.trim()) return;
    habit.name = values.name.trim();
    habit.target = values.target && String(values.target).trim() ? Number(values.target) : null;
    await DB.put('habits', habit);
    render();
  }

  async function changeCount(id, delta, btnEl) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    habit.count = Math.max(0, habit.count + delta);
    recordHistorySnapshot(habit, habit.count);
    await DB.put('habits', habit);
    const counterEl = document.querySelector(`.habit-counter[data-id="${id}"]`);
    if (counterEl) {
      counterEl.textContent = habit.count;
      triggerPulse(counterEl);
    }
    if (btnEl) triggerPulse(btnEl);
  }

  async function resetOne(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    habit.count = 0;
    habit.lastResetAt = new Date().toISOString();
    recordHistorySnapshot(habit, 0);
    await DB.put('habits', habit);
    render();
  }

  async function resetAllFlow() {
    const filtered = habits.filter(h => h.frequency === currentFreq);
    if (!filtered.length) return;
    const ok = await Modal.confirmDialog({
      title: `Reset all ${currentFreq} habits?`,
      message: "All counts in this view go back to 0. This can't be undone.",
      confirmLabel: 'Reset All'
    });
    if (!ok) return;
    const now = new Date().toISOString();
    for (const h of filtered) {
      h.count = 0;
      h.lastResetAt = now;
      recordHistorySnapshot(h, 0);
      await DB.put('habits', h);
    }
    render();
  }

  async function deleteHabit(id) {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    const ok = await Modal.confirmDialog({
      title: `Delete "${habit.name}"?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete'
    });
    if (!ok) return;
    await DB.delete('habits', id);
    render();
  }

  async function addHabitFlow() {
    const values = await Modal.form({
      title: `New ${currentFreq === 'daily' ? 'Daily' : 'Weekly'} Habit`,
      fields: [
        { key: 'name', label: 'Habit name', type: 'text', placeholder: 'e.g. Morning walk' },
        { key: 'target', label: 'Target (optional)', type: 'number', placeholder: 'e.g. 33, 10, 4' }
      ],
      submitLabel: 'Add'
    });
    if (!values || !values.name.trim()) return;
    const habit = {
      id: uid(),
      name: values.name.trim(),
      frequency: currentFreq,
      target: values.target && String(values.target).trim() ? Number(values.target) : null,
      count: 0,
      lastResetAt: new Date().toISOString(),
      history: {}
    };
    recordHistorySnapshot(habit, 0);
    await DB.put('habits', habit);
    render();
  }

  return { render };
})();
