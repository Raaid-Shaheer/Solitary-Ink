// Traits: Strengths & Weaknesses, same visual weight, different marker only.

const Traits = (() => {
  let traits = [];

  async function load() {
    traits = await DB.getAll('traits');
    traits.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
  }

  function entryCard(t) {
    return `
      <div class="relative rounded-lg bg-surface-container-low p-4 pr-20 hover:bg-surface-container transition-colors" data-id="${t.id}">
        <div class="flex justify-between items-start mb-1">
          <h3 class="font-body-lg text-body-lg text-on-surface">${t.title}</h3>
          <span class="font-label-sm text-label-sm text-on-surface-variant/60">${formatDate(t.createdAt)}</span>
        </div>
        ${t.note ? `<p class="text-on-surface-variant font-body-md text-sm leading-relaxed">${t.note}</p>` : ''}
        <div class="absolute top-2 right-2 flex gap-0.5">
          <button class="edit-trait-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" data-id="${t.id}" title="Edit">
            <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
          </button>
          <button class="delete-trait-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" data-id="${t.id}" title="Delete">
            <span class="material-symbols-outlined" style="font-size:18px;">close</span>
          </button>
        </div>
      </div>`;
  }

  function section(kind, title, marker) {
    const items = traits.filter(t => t.kind === kind);
    return `
      <section class="mb-section-margin relative">
        <div class="flex justify-between items-center bg-surface-container-low p-4 rounded-lg mb-6">
          <div class="flex items-center gap-4">
            ${marker}
            <h2 class="font-headline-md text-headline-md text-primary">${title}</h2>
          </div>
        </div>
        <div class="space-y-4">
          ${items.length ? items.map(entryCard).join('') : `<p class="font-body-md text-body-md text-on-surface-variant/60 px-2">No ${title.toLowerCase()} logged yet.</p>`}
        </div>
        <button class="add-trait-btn mt-4 flex items-center gap-2 text-primary/60 hover:text-primary transition-colors mx-auto p-2" data-kind="${kind}">
          <span class="material-symbols-outlined">add</span>
        </button>
      </section>`;
  }

  async function render() {
    await load();
    const app = document.getElementById('app-content');
    app.innerHTML = `
      ${section('strength', 'Strengths', `<div class="w-1.5 h-1.5 rounded-full bg-primary/40"></div>`)}
      <div class="thread-line w-full my-section-margin opacity-30" style="height:1px;background-image:linear-gradient(to right, rgba(215,195,180,0.3) 50%, transparent 50%);background-size:8px 100%;"></div>
      ${section('weakness', 'Weaknesses', `<div class="flex gap-1"><div class="w-1.5 h-1.5 rounded-full border border-primary/40"></div><div class="w-1.5 h-1.5 rounded-full border border-primary/40"></div></div>`)}
    `;

    document.querySelectorAll('.add-trait-btn').forEach(btn =>
      btn.addEventListener('click', () => addTraitFlow(btn.dataset.kind)));
    document.querySelectorAll('.delete-trait-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTrait(btn.dataset.id); }));
    document.querySelectorAll('.edit-trait-btn').forEach(btn =>
      btn.addEventListener('click', (e) => { e.stopPropagation(); editTraitFlow(btn.dataset.id); }));
  }

  async function editTraitFlow(id) {
    const t = traits.find(x => x.id === id);
    if (!t) return;
    const values = await Modal.form({
      title: 'Edit',
      fields: [
        { key: 'title', label: 'Title', type: 'text', value: t.title },
        { key: 'note', label: 'Note', type: 'textarea', value: t.note || '' }
      ],
      submitLabel: 'Save'
    });
    if (!values || !values.title.trim()) return;
    t.title = values.title.trim();
    t.note = values.note.trim();
    await DB.put('traits', t);
    render();
  }

  async function addTraitFlow(kind) {
    const values = await Modal.form({
      title: kind === 'strength' ? 'New Strength' : 'New Weakness',
      fields: [
        { key: 'title', label: 'Title', type: 'text', placeholder: 'e.g. Patience' },
        { key: 'note', label: 'Note (optional)', type: 'textarea', placeholder: 'A short note on this' }
      ],
      submitLabel: 'Add'
    });
    if (!values || !values.title.trim()) return;
    await DB.put('traits', {
      id: uid(),
      kind,
      title: values.title.trim(),
      note: values.note.trim(),
      createdAt: new Date().toISOString()
    });
    render();
  }

  async function deleteTrait(id) {
    const ok = await Modal.confirmDialog({ title: 'Delete this entry?', message: "This can't be undone.", confirmLabel: 'Delete' });
    if (!ok) return;
    await DB.delete('traits', id);
    render();
  }

  return { render };
})();
