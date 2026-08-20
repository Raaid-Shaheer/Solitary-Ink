// Exercises: same tap-to-count mechanics as Zikr, but for reps instead of
// remembrance — the GIF stays hidden on the list and only plays once you
// open an exercise into focus mode.

const Exercises = (() => {
  let exercises = [];

  async function load() {
    exercises = await DB.getAll('exercises');
  }

  function ringSvg(count, target, size = 64) {
    const pct = target ? Math.min(100, Math.round((count / target) * 100)) : 0;
    return `
      <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path class="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="1.5"></path>
        <path class="text-primary" style="stroke-dasharray:4 6; stroke-linecap:round;" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${pct}, 100" stroke-width="1.5"></path>
      </svg>`;
  }

  function card(ex) {
    const complete = ex.target && ex.count >= ex.target;
    return `
      <div class="bg-surface-container rounded-lg border border-outline-variant/10 overflow-hidden">
        <div class="flex justify-end gap-0.5 px-2 pt-2">
          <button class="history-exercise-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" title="History" data-id="${ex.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">trending_up</span>
          </button>
          <button class="edit-exercise-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" title="Edit" data-id="${ex.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
          </button>
          <button class="delete-exercise-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" title="Delete" data-id="${ex.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">close</span>
          </button>
        </div>
        <button data-id="${ex.id}" class="exercise-card w-full text-left px-6 pb-6 pt-1 active:scale-[0.98] transition-transform duration-200 flex justify-between items-center relative overflow-hidden ${complete ? 'glow-active' : ''}">
          ${!complete ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-50 rounded-l-lg"></div>` : `<div class="absolute inset-0 bg-primary/5 pointer-events-none"></div>`}
          <div class="flex items-center gap-4 relative z-10 min-w-0">
            <div class="w-14 h-14 rounded-lg bg-surface-container-lowest flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-primary/60" style="font-size:26px;">fitness_center</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-headline-md text-headline-md text-on-surface truncate">${ex.name}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Target: ${ex.target ?? '—'}</span>
            </div>
          </div>
          <div class="relative w-16 h-16 flex items-center justify-center z-10 shrink-0">
            ${complete
              ? `<div class="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-full border border-primary/20"><span class="material-symbols-outlined text-primary">check</span></div>`
              : `${ringSvg(ex.count, ex.target)}<span class="font-label-sm text-label-sm text-primary absolute">${ex.count}</span>`}
          </div>
        </button>
      </div>`;
  }

  async function render() {
    await load();
    const app = document.getElementById('app-content');
    app.innerHTML = `
      <header class="mb-section-margin flex justify-between items-end">
        <div>
          <h2 class="font-display-date text-display-date text-on-surface mb-2">Exercises</h2>
          <p class="font-body-md text-body-md text-on-surface-variant">Tap to open, tap to count.</p>
        </div>
        <button id="add-exercise-btn" class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/10 text-primary hover:bg-surface-container-highest transition-colors active:scale-95">
          <span class="material-symbols-outlined">add</span>
        </button>
      </header>
      <div class="flex flex-col gap-element-gap pb-16" id="exercise-list">
        ${exercises.length ? exercises.map(card).join('') : `<p class="font-body-md text-body-md text-on-surface-variant/60">No exercises yet. Tap + to add one.</p>`}
      </div>
    `;

    document.getElementById('add-exercise-btn').addEventListener('click', addExerciseFlow);
    document.querySelectorAll('.exercise-card').forEach(btn =>
      btn.addEventListener('click', () => openFocus(btn.dataset.id)));
    document.querySelectorAll('.edit-exercise-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); editExerciseFlow(btn.dataset.id); }));
    document.querySelectorAll('.delete-exercise-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteExerciseFlow(btn.dataset.id); }));
    document.querySelectorAll('.history-exercise-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); openExerciseHistory(btn.dataset.id); }));
  }

  function openExerciseHistory(id) {
    const ex = exercises.find(x => x.id === id);
    if (!ex) return;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[95] flex items-end md:items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-1">${ex.name}</h3>
        <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-6">Last 14 days</p>
        ${renderSparkline(ex.history, 14, ex.target)}
        <button id="exercise-history-close-btn" class="w-full mt-8 px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">Close</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#exercise-history-close-btn').addEventListener('click', () => overlay.remove());
  }

  async function addExerciseFlow() {
    const values = await Modal.form({
      title: 'New Exercise',
      fields: [
        { key: 'gif', label: 'GIF', type: 'file' },
        { key: 'name', label: 'Exercise name', type: 'text', placeholder: 'e.g. Push-ups' },
        { key: 'target', label: 'Target reps (optional)', type: 'number', placeholder: 'e.g. 20' }
      ],
      submitLabel: 'Add'
    });
    if (!values) return;
    if (!values.name.trim()) {
      await Modal.alertDialog({ title: 'Missing name', message: 'Give the exercise a name.' });
      return;
    }
    if (!values.gif) {
      await Modal.alertDialog({ title: 'Missing GIF', message: 'Add a GIF for this exercise.' });
      return;
    }
    const exercise = {
      id: uid(),
      name: values.name.trim(),
      gif: values.gif,
      target: values.target && String(values.target).trim() ? Number(values.target) : null,
      count: 0,
      history: {}
    };
    recordHistorySnapshot(exercise, 0);
    await DB.put('exercises', exercise);
    render();
  }

  async function editExerciseFlow(id) {
    const ex = exercises.find(x => x.id === id);
    if (!ex) return;
    const values = await Modal.form({
      title: 'Edit Exercise',
      fields: [
        { key: 'gif', label: 'GIF', type: 'file', value: ex.gif },
        { key: 'name', label: 'Exercise name', type: 'text', value: ex.name },
        { key: 'target', label: 'Target reps', type: 'number', value: ex.target ?? '' }
      ],
      submitLabel: 'Save'
    });
    if (!values) return;
    if (!values.name.trim()) {
      await Modal.alertDialog({ title: 'Missing name', message: 'Give the exercise a name.' });
      return;
    }
    if (!values.gif) {
      await Modal.alertDialog({ title: 'Missing GIF', message: 'Keep a GIF for this exercise.' });
      return;
    }
    ex.name = values.name.trim();
    ex.gif = values.gif;
    ex.target = values.target && String(values.target).trim() ? Number(values.target) : null;
    await DB.put('exercises', ex);
    render();
  }

  async function deleteExerciseFlow(id) {
    const ex = exercises.find(x => x.id === id);
    if (!ex) return;
    const ok = await Modal.confirmDialog({
      title: `Delete "${ex.name}"?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete'
    });
    if (!ok) return;
    await DB.delete('exercises', id);
    render();
  }

  function openFocus(id) {
    const ex = exercises.find(x => x.id === id);
    if (!ex) return;

    const overlay = document.createElement('div');
    overlay.id = 'exercise-focus-overlay';
    overlay.className = 'fixed inset-0 bg-background z-[90] flex flex-col';
    overlay.innerHTML = `
      <header class="flex justify-between items-center w-full px-container-padding h-16 max-w-max-width-content mx-auto w-full">
        <button id="ex-focus-close-btn" class="text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">Focus Mode</div>
        <button id="ex-focus-reset-btn" class="text-on-surface-variant hover:text-primary transition-colors p-2 -mr-2">
          <span class="material-symbols-outlined">restart_alt</span>
        </button>
      </header>
      <div class="flex-1 flex flex-col items-center justify-center px-container-padding max-w-max-width-content mx-auto w-full overflow-y-auto py-4">
        <div class="text-center mb-8 flex flex-col items-center gap-4">
          <img src="${ex.gif}" class="w-56 h-56 rounded-2xl object-cover" alt="${ex.name}"/>
          <span class="font-headline-md text-headline-md text-on-surface">${ex.name}</span>
        </div>
        <button id="ex-focus-tap-btn" class="w-48 h-48 rounded-full bg-surface-container border-2 border-primary/30 flex flex-col items-center justify-center active:scale-95 transition-transform shadow-[0_0_30px_rgba(215,195,180,0.1)]">
          <span class="font-display-date text-display-date text-primary" id="ex-focus-count" style="font-size:56px;">${ex.count}</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-2" id="ex-focus-target-label">${ex.target ? 'of ' + ex.target : ''}</span>
        </button>
        <p class="font-label-sm text-label-sm text-primary uppercase tracking-widest mt-8 ${ex.target && ex.count >= ex.target ? '' : 'hidden'}" id="ex-focus-complete-msg">Complete</p>
      </div>
    `;
    document.body.appendChild(overlay);

    const countEl = overlay.querySelector('#ex-focus-count');
    const completeMsg = overlay.querySelector('#ex-focus-complete-msg');

    overlay.querySelector('#ex-focus-tap-btn').addEventListener('click', async () => {
      ex.count += 1;
      countEl.textContent = ex.count;
      countEl.classList.remove('animate-tick');
      void countEl.offsetWidth;
      countEl.classList.add('animate-tick');
      if (ex.target && ex.count >= ex.target) completeMsg.classList.remove('hidden');
      recordHistorySnapshot(ex, ex.count);
      await DB.put('exercises', ex);
    });

    overlay.querySelector('#ex-focus-reset-btn').addEventListener('click', async () => {
      const ok = await Modal.confirmDialog({ title: 'Reset this counter?', message: 'It will go back to 0.', confirmLabel: 'Reset', danger: false });
      if (!ok) return;
      ex.count = 0;
      countEl.textContent = 0;
      completeMsg.classList.add('hidden');
      recordHistorySnapshot(ex, 0);
      await DB.put('exercises', ex);
    });

    overlay.querySelector('#ex-focus-close-btn').addEventListener('click', () => {
      overlay.remove();
      render();
    });
  }

  return { render };
})();
