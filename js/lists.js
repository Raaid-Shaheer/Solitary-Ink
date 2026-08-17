// Lists: 7 personal collections. Top-level grid + a per-list mixed-content feed.

const LIST_DEFS = [
  { slug: 'try', title: 'Things I want to try' },
  { slug: 'forget', title: "Things I don't want to forget" },
  { slug: 'postponing', title: 'Things I keep postponing' },
  { slug: 'happy', title: 'Things that make me happy' },
  { slug: 'hardway', title: 'Things I learnt the hard way' },
  { slug: 'future', title: 'Ideas for my future' },
  { slug: 'matter', title: 'Things that matter the most' }
];

const Lists = (() => {
  let items = [];
  let openSlug = null;

  async function load() {
    items = await DB.getAll('listItems');
  }

  function countFor(slug) {
    return items.filter(i => i.list === slug).length;
  }

  function renderTop() {
    const app = document.getElementById('app-content');
    app.innerHTML = `
      <div class="mb-section-margin">
        <h2 class="font-display-date text-display-date text-primary mb-2">Collections</h2>
        <p class="font-body-md text-body-md text-on-surface-variant">Thoughts organized by intent.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-element-gap">
        ${LIST_DEFS.map((l, idx) => `
          <button data-slug="${l.slug}" class="list-card group relative flex flex-col items-start justify-between p-6 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors duration-300 border border-outline-variant/20 active:scale-[0.98] text-left w-full h-32 ${idx === LIST_DEFS.length - 1 ? 'md:col-span-2' : ''}">
            <span class="font-headline-md text-headline-md text-primary transition-colors line-clamp-2">${l.title}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-4">${countFor(l.slug)} Entries</span>
          </button>`).join('')}
      </div>
    `;
    document.querySelectorAll('.list-card').forEach(btn =>
      btn.addEventListener('click', () => { openSlug = btn.dataset.slug; visibleCount = LIST_PAGE_SIZE; renderDetail(); }));
  }

  function entryBlock(item) {
    if (item.type === 'text') {
      return `
        <div class="relative pl-6" data-id="${item.id}">
          <div class="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-primary/40"></div>
          <div class="flex justify-end gap-0.5 mb-1">${editBtn(item.id)}${deleteBtn(item.id)}</div>
          <p class="font-body-md text-body-md text-on-surface leading-relaxed bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">${item.text}</p>
        </div>`;
    }
    if (item.type === 'image') {
      return `
        <div class="relative pl-6" data-id="${item.id}">
          <div class="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-primary/40"></div>
          <div class="flex justify-end gap-0.5 mb-1">${editBtn(item.id)}${deleteBtn(item.id)}</div>
          <div class="rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-lowest">
            <img src="${item.imageData}" class="w-full max-h-80 object-cover" alt=""/>
            ${item.caption ? `<div class="p-3 border-t border-outline-variant/10"><span class="font-label-sm text-label-sm text-on-surface-variant">${item.caption}</span></div>` : ''}
          </div>
        </div>`;
    }
    if (item.type === 'link') {
      const isMusic = /music\.youtube\.com/.test(item.linkUrl || '');
      return `
        <div class="relative pl-6" data-id="${item.id}">
          <div class="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-primary/40"></div>
          <div class="flex justify-end gap-0.5 mb-1">${editBtn(item.id)}${deleteBtn(item.id)}</div>
          <a href="${item.linkUrl}" target="_blank" rel="noopener" class="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:bg-surface-container-low transition-colors">
            <div class="w-full sm:w-32 h-20 bg-surface-container rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
              ${item.linkThumb
                ? `<img src="${item.linkThumb}" class="w-full h-full object-cover" alt=""/>`
                : `<span class="material-symbols-outlined text-outline/50 text-3xl">play_circle</span>`}
            </div>
            <div class="flex flex-col justify-center">
              <h4 class="font-body-md text-body-md text-primary font-medium line-clamp-2 mb-1">${item.linkTitle || item.linkUrl}</h4>
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-error/80" style="font-size:14px;">smart_display</span>
                <span class="font-label-sm text-label-sm text-on-surface-variant">${isMusic ? 'YouTube Music' : 'YouTube'}</span>
              </div>
            </div>
          </a>
        </div>`;
    }
    return '';
  }

  function editBtn(id) {
    return `<button class="edit-item-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container-high active:scale-90 transition-all" data-id="${id}" title="Edit"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>`;
  }

  function deleteBtn(id) {
    return `<button class="delete-item-btn w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 active:scale-90 transition-all" data-id="${id}" title="Delete"><span class="material-symbols-outlined" style="font-size:18px;">close</span></button>`;
  }

  const LIST_PAGE_SIZE = 15;
  let visibleCount = LIST_PAGE_SIZE;

  function renderDetail() {
    const def = LIST_DEFS.find(l => l.slug === openSlug);
    const listItemsFiltered = items.filter(i => i.list === openSlug)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const slice = listItemsFiltered.slice(0, visibleCount);
    const remaining = listItemsFiltered.length - visibleCount;

    const app = document.getElementById('app-content');
    app.innerHTML = `
      <div class="flex items-center gap-2 mb-6 -ml-2">
        <button id="lists-back-btn" class="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full">
          <span class="material-symbols-outlined">arrow_back</span>
          <span class="font-label-sm text-label-sm uppercase tracking-widest">Back</span>
        </button>
      </div>
      <div class="mb-section-margin">
        <h2 class="font-display-date text-display-date text-primary leading-tight">${def.title}</h2>
        <div class="h-[1px] w-12 bg-primary/30 mt-6 mb-2"></div>
      </div>
      <div class="space-y-6 pb-6" id="list-entries">
        ${slice.length ? slice.map(entryBlock).join('') : `<p class="font-body-md text-body-md text-on-surface-variant/60">Nothing here yet.</p>`}
      </div>
      ${remaining > 0 ? `
        <button id="list-load-more" class="w-full mt-2 mb-24 py-3 rounded-full border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors font-label-sm text-label-sm uppercase tracking-wider">
          Load more (${remaining} left)
        </button>` : '<div class="pb-24"></div>'}

      <div class="fixed bottom-24 right-6 z-40 flex flex-col gap-3 items-end" id="lists-fab-container">
        <div class="hidden flex-col gap-3 items-end" id="lists-fab-menu">
          <button class="add-entry-btn flex items-center gap-3 bg-surface-container border border-outline-variant/20 px-4 py-2 rounded-full hover:bg-surface-container-high shadow-lg" data-type="text">
            <span class="font-label-sm text-label-sm text-primary">Text</span>
            <span class="material-symbols-outlined text-primary" style="font-size:20px;">notes</span>
          </button>
          <button class="add-entry-btn flex items-center gap-3 bg-surface-container border border-outline-variant/20 px-4 py-2 rounded-full hover:bg-surface-container-high shadow-lg" data-type="image">
            <span class="font-label-sm text-label-sm text-primary">Image</span>
            <span class="material-symbols-outlined text-primary" style="font-size:20px;">image</span>
          </button>
          <button class="add-entry-btn flex items-center gap-3 bg-surface-container border border-outline-variant/20 px-4 py-2 rounded-full hover:bg-surface-container-high shadow-lg" data-type="link">
            <span class="font-label-sm text-label-sm text-primary">Link</span>
            <span class="material-symbols-outlined text-primary" style="font-size:20px;">link</span>
          </button>
        </div>
        <button id="lists-main-fab" class="w-14 h-14 bg-primary text-on-primary-container rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
          <span class="material-symbols-outlined" id="lists-fab-icon">add</span>
        </button>
      </div>
    `;

    document.getElementById('lists-back-btn').addEventListener('click', () => { openSlug = null; visibleCount = LIST_PAGE_SIZE; renderTop(); });

    const loadMoreBtn = document.getElementById('list-load-more');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => { visibleCount += LIST_PAGE_SIZE; renderDetail(); });

    let fabOpen = false;
    const fabMenu = document.getElementById('lists-fab-menu');
    const fabIcon = document.getElementById('lists-fab-icon');
    document.getElementById('lists-main-fab').addEventListener('click', () => {
      fabOpen = !fabOpen;
      fabMenu.classList.toggle('hidden', !fabOpen);
      fabMenu.classList.toggle('flex', fabOpen);
      fabIcon.style.transform = fabOpen ? 'rotate(45deg)' : 'rotate(0deg)';
    });

    document.querySelectorAll('.add-entry-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        fabOpen = false;
        fabMenu.classList.add('hidden');
        fabMenu.classList.remove('flex');
        addEntryFlow(btn.dataset.type);
      }));

    document.querySelectorAll('.delete-item-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteItem(btn.dataset.id)));
    document.querySelectorAll('.edit-item-btn').forEach(btn =>
      btn.addEventListener('click', () => editItemFlow(btn.dataset.id)));
  }

  async function editItemFlow(id) {
    const item = items.find(i => i.id === id);
    if (!item) return;

    if (item.type === 'text') {
      const values = await Modal.form({
        title: 'Edit Entry',
        fields: [{ key: 'text', label: 'Entry', type: 'textarea', rows: 4, value: item.text }],
        submitLabel: 'Save'
      });
      if (!values || !values.text.trim()) return;
      item.text = values.text.trim();
      await DB.put('listItems', item);
      await load();
      renderDetail();
      return;
    }

    if (item.type === 'image') {
      const values = await Modal.form({
        title: 'Edit Image',
        fields: [
          { key: 'image', label: 'Image', type: 'file', value: item.imageData },
          { key: 'caption', label: 'Caption', type: 'text', value: item.caption || '' }
        ],
        submitLabel: 'Save'
      });
      if (!values) return;
      if (values.image) item.imageData = values.image;
      item.caption = values.caption.trim();
      await DB.put('listItems', item);
      await load();
      renderDetail();
      return;
    }

    if (item.type === 'link') {
      const values = await Modal.form({
        title: 'Edit Link',
        fields: [{ key: 'url', label: 'YouTube / YTMusic URL', type: 'text', value: item.linkUrl }],
        submitLabel: 'Save'
      });
      if (!values || !values.url.trim()) return;
      const urlChanged = values.url.trim() !== item.linkUrl;
      item.linkUrl = values.url.trim();
      if (urlChanged) {
        item.linkTitle = null;
        item.linkThumb = null;
      }
      await DB.put('listItems', item);
      await load();
      renderDetail();
      if (urlChanged) fetchLinkPreview(item);
      return;
    }
  }

  async function addEntryFlow(type) {
    if (type === 'text') {
      const values = await Modal.form({
        title: 'New Entry',
        fields: [{ key: 'text', label: 'Entry', type: 'textarea', rows: 4, placeholder: 'Write it down...' }],
        submitLabel: 'Add'
      });
      if (!values || !values.text.trim()) return;
      await DB.put('listItems', { id: uid(), list: openSlug, type: 'text', text: values.text.trim(), createdAt: new Date().toISOString() });
      await load();
      renderDetail();
      return;
    }

    if (type === 'image') {
      const values = await Modal.form({
        title: 'New Image',
        fields: [
          { key: 'image', label: 'Image', type: 'file' },
          { key: 'caption', label: 'Caption (optional)', type: 'text' }
        ],
        submitLabel: 'Add'
      });
      if (!values || !values.image) return;
      await DB.put('listItems', {
        id: uid(), list: openSlug, type: 'image',
        imageData: values.image, caption: values.caption.trim(),
        createdAt: new Date().toISOString()
      });
      await load();
      renderDetail();
      return;
    }

    if (type === 'link') {
      const values = await Modal.form({
        title: 'New Link',
        fields: [{ key: 'url', label: 'YouTube / YTMusic URL', type: 'text', placeholder: 'https://youtube.com/watch?v=...' }],
        submitLabel: 'Add'
      });
      if (!values || !values.url.trim()) return;
      const item = { id: uid(), list: openSlug, type: 'link', linkUrl: values.url.trim(), createdAt: new Date().toISOString() };
      await DB.put('listItems', item);
      await load();
      renderDetail();
      fetchLinkPreview(item);
      return;
    }
  }

  function extractYouTubeId(url) {
    const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  async function fetchLinkPreview(item) {
    const videoId = extractYouTubeId(item.linkUrl);
    if (!videoId) return;
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + videoId)}&format=json`;
      const res = await fetch(oembedUrl);
      if (!res.ok) return;
      const data = await res.json();
      item.linkTitle = data.title;
      item.linkThumb = data.thumbnail_url;
      await DB.put('listItems', item);
      await load();
      if (openSlug === item.list) renderDetail();
    } catch (e) {
      // Offline or blocked — link still saved, just without a preview.
    }
  }

  async function deleteItem(id) {
    const ok = await Modal.confirmDialog({ title: 'Delete this entry?', message: "This can't be undone.", confirmLabel: 'Delete' });
    if (!ok) return;
    await DB.delete('listItems', id);
    await load();
    renderDetail();
  }

  async function render() {
    await load();
    openSlug = null;
    renderTop();
  }

  return { render };
})();
