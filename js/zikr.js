// Zikr: devotional counter with per-zikr target, list + full-screen focus mode.

const Zikr = (() => {
  let zikrs = [];

  async function load() {
    zikrs = await DB.getAll('zikrs');
  }

  function ringSvg(count, target, size = 64) {
    const pct = target ? Math.min(100, Math.round((count / target) * 100)) : 0;
    return `
      <svg class="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
        <path class="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="1.5"></path>
        <path class="text-primary" style="stroke-dasharray:4 6; stroke-linecap:round;" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-dasharray="${pct}, 100" stroke-width="1.5"></path>
      </svg>`;
  }

  function card(z) {
    const complete = z.target && z.count >= z.target;
    return `
      <div class="bg-surface-container rounded-lg border border-outline-variant/10 overflow-hidden">
        <div class="flex justify-end gap-0.5 px-2 pt-2">
          <button class="history-zikr-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" title="History" data-id="${z.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">trending_up</span>
          </button>
          <button class="edit-zikr-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" title="Edit" data-id="${z.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
          </button>
          <button class="delete-zikr-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" title="Delete" data-id="${z.id}">
            <span class="material-symbols-outlined" style="font-size:18px;">close</span>
          </button>
        </div>
        <button data-id="${z.id}" class="zikr-card w-full text-left px-6 pb-6 pt-1 active:scale-[0.98] transition-transform duration-200 flex justify-between items-center relative overflow-hidden ${complete ? 'glow-active' : ''}">
          ${!complete ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-50 rounded-l-lg"></div>` : `<div class="absolute inset-0 bg-primary/5 pointer-events-none"></div>`}
          <div class="flex items-center gap-4 relative z-10 min-w-0">
            ${z.image ? `<img src="${z.image}" class="w-14 h-14 rounded-lg object-cover shrink-0" alt=""/>` : ''}
            <div class="flex flex-col gap-2 min-w-0">
              ${z.arabic ? `<span class="font-display-date text-display-date text-primary leading-tight truncate font-indopak" dir="rtl">${z.arabic}</span>` : ''}
              <div class="min-w-0">
                <span class="font-body-lg text-body-lg text-on-surface block truncate">${z.transliteration || ''}</span>
                <span class="font-body-md text-body-md text-on-surface-variant block truncate">${z.english || ''}</span>
              </div>
            </div>
          </div>
          <div class="relative w-16 h-16 flex items-center justify-center z-10 shrink-0">
            ${complete
              ? `<div class="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-full border border-primary/20"><span class="material-symbols-outlined text-primary">check</span></div>`
              : `${ringSvg(z.count, z.target)}<span class="font-label-sm text-label-sm text-primary absolute">${z.count}</span>`}
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
          <h2 class="font-display-date text-display-date text-on-surface mb-2">Zikr</h2>
          <p class="font-body-md text-body-md text-on-surface-variant">Devotional remembrance.</p>
        </div>
        <button id="add-zikr-btn" class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant/10 text-primary hover:bg-surface-container-highest transition-colors active:scale-95">
          <span class="material-symbols-outlined">add</span>
        </button>
      </header>
      <div class="flex flex-col gap-element-gap pb-16" id="zikr-list">
        ${zikrs.length ? zikrs.map(card).join('') : `<p class="font-body-md text-body-md text-on-surface-variant/60">No zikr added yet. Tap + to add one.</p>`}
      </div>
    `;

    document.getElementById('add-zikr-btn').addEventListener('click', addZikrFlow);
    document.querySelectorAll('.zikr-card').forEach(btn =>
      btn.addEventListener('click', () => openFocus(btn.dataset.id)));
    document.querySelectorAll('.edit-zikr-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); editZikrFlow(btn.dataset.id); }));
    document.querySelectorAll('.delete-zikr-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteZikrFlow(btn.dataset.id); }));
    document.querySelectorAll('.history-zikr-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); openZikrHistory(btn.dataset.id); }));
  }

  function openZikrHistory(id) {
    const z = zikrs.find(x => x.id === id);
    if (!z) return;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[95] flex items-end md:items-center justify-center';
    overlay.innerHTML = `
      <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-1">${z.transliteration || z.arabic}</h3>
        <p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-6">Last 14 days</p>
        ${renderSparkline(z.history, 14, z.target)}
        <button id="zikr-history-close-btn" class="w-full mt-8 px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">Close</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#zikr-history-close-btn').addEventListener('click', () => overlay.remove());
  }

  async function editZikrFlow(id) {
    const z = zikrs.find(x => x.id === id);
    if (!z) return;
    const values = await Modal.form({
      title: 'Edit Zikr',
      fields: [
        { key: 'image', label: 'Image', type: 'file', value: z.image || '' },
        { key: 'arabic', label: 'Arabic text', type: 'textarea', rows: 2, value: z.arabic || '' },
        { key: 'transliteration', label: 'Transliteration', type: 'text', value: z.transliteration || '' },
        { key: 'english', label: 'English meaning', type: 'text', value: z.english || '' },
        { key: 'target', label: 'Target count', type: 'number', value: z.target ?? '' }
      ],
      submitLabel: 'Save'
    });
    if (!values) return;
    if (!values.arabic.trim() && !values.image) {
      await Modal.alertDialog({ title: 'Missing content', message: 'Keep either Arabic text or an image.' });
      return;
    }
    z.arabic = values.arabic.trim();
    z.transliteration = values.transliteration.trim();
    z.english = values.english.trim();
    z.target = values.target && String(values.target).trim() ? Number(values.target) : null;
    z.image = values.image || null;
    await DB.put('zikrs', z);
    render();
  }

  async function deleteZikrFlow(id) {
    const z = zikrs.find(x => x.id === id);
    if (!z) return;
    const ok = await Modal.confirmDialog({
      title: `Delete "${z.transliteration || z.arabic || 'this zikr'}"?`,
      message: "This can't be undone.",
      confirmLabel: 'Delete'
    });
    if (!ok) return;
    await DB.delete('zikrs', id);
    render();
  }

  async function addZikrFlow() {
    const values = await Modal.form({
      title: 'New Zikr',
      fields: [
        { key: 'image', label: 'Upload an image (instead of typing it out)', type: 'file' },
        { key: 'arabic', label: 'Arabic text (optional if using an image)', type: 'textarea', rows: 2, placeholder: 'سُبْحَانَ الله' },
        { key: 'transliteration', label: 'Transliteration', type: 'text', placeholder: 'e.g. Subhanallah' },
        { key: 'english', label: 'English meaning', type: 'text', placeholder: 'e.g. Glory be to Allah' },
        { key: 'target', label: 'Target count', type: 'number', value: 33 }
      ],
      submitLabel: 'Add'
    });
    if (!values) return;
    if (!values.arabic.trim() && !values.image) {
      await Modal.alertDialog({ title: 'Missing content', message: 'Add either Arabic text or an image.' });
      return;
    }
    const zikr = {
      id: uid(),
      arabic: values.arabic.trim(),
      transliteration: values.transliteration.trim(),
      english: values.english.trim(),
      target: values.target && String(values.target).trim() ? Number(values.target) : null,
      count: 0,
      image: values.image || null,
      history: {}
    };
    recordHistorySnapshot(zikr, 0);
    await DB.put('zikrs', zikr);
    render();
  }

  function openFocus(id) {
    const z = zikrs.find(z => z.id === id);
    if (!z) return;

    const overlay = document.createElement('div');
    overlay.id = 'zikr-focus-overlay';
    overlay.className = 'fixed inset-0 bg-background z-[90] flex flex-col';
    overlay.innerHTML = `
      <header class="flex justify-between items-center w-full px-container-padding h-16 max-w-max-width-content mx-auto w-full">
        <button id="focus-close-btn" class="text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2">
          <span class="material-symbols-outlined">close</span>
        </button>
        <div class="font-label-sm text-label-sm text-on-surface-variant tracking-widest uppercase">Focus Mode</div>
        <button id="focus-reset-btn" class="text-on-surface-variant hover:text-primary transition-colors p-2 -mr-2">
          <span class="material-symbols-outlined">restart_alt</span>
        </button>
      </header>
      <div class="flex-1 flex flex-col items-center justify-center px-container-padding max-w-max-width-content mx-auto w-full">
        <div class="text-center mb-12 flex flex-col items-center gap-4">
          ${z.image ? `<img src="${z.image}" class="w-40 h-40 rounded-2xl object-cover mb-2" alt=""/>` : ''}
          ${z.arabic ? `<span class="text-[56px] leading-tight text-primary font-indopak" dir="rtl">${z.arabic}</span>` : ''}
          <div class="flex flex-col items-center">
            <span class="font-headline-md text-headline-md text-on-surface">${z.transliteration || ''}</span>
            <span class="font-body-md text-body-md text-on-surface-variant mt-1">${z.english || ''}</span>
          </div>
        </div>
        <button id="focus-tap-btn" class="w-48 h-48 rounded-full bg-surface-container border-2 border-primary/30 flex flex-col items-center justify-center active:scale-95 transition-transform shadow-[0_0_30px_rgba(215,195,180,0.1)]">
          <span class="font-display-date text-display-date text-primary" id="focus-count" style="font-size:56px;">${z.count}</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-2" id="focus-target-label">${z.target ? 'of ' + z.target : ''}</span>
        </button>
        <p class="font-label-sm text-label-sm text-primary uppercase tracking-widest mt-8 ${z.target && z.count >= z.target ? '' : 'hidden'}" id="focus-complete-msg">Complete</p>
      </div>
    `;
    document.body.appendChild(overlay);

    const countEl = overlay.querySelector('#focus-count');
    const completeMsg = overlay.querySelector('#focus-complete-msg');

    overlay.querySelector('#focus-tap-btn').addEventListener('click', async () => {
      z.count += 1;
      countEl.textContent = z.count;
      countEl.classList.remove('animate-tick');
      void countEl.offsetWidth;
      countEl.classList.add('animate-tick');
      if (z.target && z.count >= z.target) completeMsg.classList.remove('hidden');
      recordHistorySnapshot(z, z.count);
      await DB.put('zikrs', z);
    });

    overlay.querySelector('#focus-reset-btn').addEventListener('click', async () => {
      const ok = await Modal.confirmDialog({ title: 'Reset this counter?', message: 'It will go back to 0.', confirmLabel: 'Reset', danger: false });
      if (!ok) return;
      z.count = 0;
      countEl.textContent = 0;
      completeMsg.classList.add('hidden');
      recordHistorySnapshot(z, 0);
      await DB.put('zikrs', z);
    });

    overlay.querySelector('#focus-close-btn').addEventListener('click', () => {
      overlay.remove();
      render();
    });
  }

  return { render };
})();
