// A small, dependency-free modal system matching the Solitude & Ink design
// tokens, used everywhere instead of window.prompt/confirm/alert (which
// render as ugly, unstyled browser chrome like "localhost says").

const Modal = (() => {
  function fieldHTML(f, idx) {
    const id = `modal-field-${idx}`;
    if (f.type === 'textarea') {
      return `<div class="mb-4">
        <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">${f.label}</label>
        <textarea id="${id}" rows="${f.rows || 3}" placeholder="${f.placeholder || ''}" style="color-scheme:dark;" class="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-on-surface font-body-md focus:border-primary/50 outline-none resize-none">${f.value || ''}</textarea>
      </div>`;
    }
    if (f.type === 'file') {
      return `<div class="mb-4">
        <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">${f.label}</label>
        <div class="flex items-center gap-3">
          <label class="px-4 py-2 rounded-full border border-dashed border-outline-variant/40 text-on-surface-variant hover:text-primary cursor-pointer font-label-sm text-label-sm transition-colors">
            Choose Image
            <input type="file" accept="image/*" id="${id}" class="hidden"/>
          </label>
          <img id="${id}-preview" src="${f.value || ''}" class="w-12 h-12 rounded-lg object-cover ${f.value ? '' : 'hidden'}" alt=""/>
          <span id="${id}-size" class="font-label-sm text-label-sm text-on-surface-variant/60"></span>
          ${f.value ? `<button type="button" id="${id}-clear" class="text-on-surface-variant hover:text-error text-xs underline">Remove</button>` : ''}
        </div>
      </div>`;
    }
    return `<div class="mb-4">
      <label class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider block mb-2">${f.label}</label>
      <input id="${id}" type="${f.type === 'number' ? 'number' : 'text'}" value="${f.value != null ? f.value : ''}" placeholder="${f.placeholder || ''}" style="color-scheme:dark;" class="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-3 text-on-surface font-body-md focus:border-primary/50 outline-none"/>
    </div>`;
  }

  // fields: [{ key, label, type: 'text'|'textarea'|'number'|'file', value, placeholder, rows }]
  // Resolves with { key: value, ... } on submit, or null on cancel.
  function form({ title, fields, submitLabel = 'Save', cancelLabel = 'Cancel' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
          <h3 class="font-headline-md text-headline-md text-on-surface mb-5">${title}</h3>
          <div id="modal-fields">${fields.map(fieldHTML).join('')}</div>
          <div class="flex gap-3 mt-2">
            <button id="modal-cancel" class="flex-1 px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">${cancelLabel}</button>
            <button id="modal-submit" class="flex-1 px-4 py-3 rounded-xl bg-surface-container-high text-primary font-body-md hover:bg-surface-bright transition-colors">${submitLabel}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      const fileData = {};
      fields.forEach((f, idx) => {
        if (f.type !== 'file') return;
        const id = `modal-field-${idx}`;
        if (f.value) fileData[f.key] = f.value;
        const input = overlay.querySelector(`#${id}`);
        const preview = overlay.querySelector(`#${id}-preview`);
        const sizeLabel = overlay.querySelector(`#${id}-size`);
        input.addEventListener('change', () => {
          const file = input.files[0];
          if (!file) return;
          const mb = file.size / (1024 * 1024);
          if (sizeLabel) {
            sizeLabel.textContent = `${mb.toFixed(1)} MB`;
            sizeLabel.classList.toggle('text-error', mb > 8);
            sizeLabel.classList.toggle('text-on-surface-variant/60', mb <= 8);
          }
          const reader = new FileReader();
          reader.onload = () => {
            fileData[f.key] = reader.result;
            preview.src = reader.result;
            preview.classList.remove('hidden');
          };
          reader.readAsDataURL(file);
        });
        const clearBtn = overlay.querySelector(`#${id}-clear`);
        if (clearBtn) clearBtn.addEventListener('click', () => {
          fileData[f.key] = null;
          preview.classList.add('hidden');
          clearBtn.classList.add('hidden');
        });
      });

      function close(result) {
        overlay.remove();
        resolve(result);
      }

      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      overlay.querySelector('#modal-cancel').addEventListener('click', () => close(null));
      overlay.querySelector('#modal-submit').addEventListener('click', () => {
        const values = {};
        fields.forEach((f, idx) => {
          if (f.type === 'file') {
            values[f.key] = fileData[f.key] || null;
          } else {
            values[f.key] = overlay.querySelector(`#modal-field-${idx}`).value;
          }
        });
        close(values);
      });

      const firstInput = overlay.querySelector('input[type="text"], textarea');
      if (firstInput) firstInput.focus();
    });
  }

  function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm">
          <h3 class="font-headline-md text-headline-md text-on-surface mb-2">${title}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant mb-6">${message}</p>
          <div class="flex gap-3">
            <button id="confirm-cancel" class="flex-1 px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">${cancelLabel}</button>
            <button id="confirm-ok" class="flex-1 px-4 py-3 rounded-xl ${danger ? 'bg-error/10 text-error hover:bg-error/20' : 'bg-surface-container-high text-primary hover:bg-surface-bright'} font-body-md transition-colors">${confirmLabel}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      function close(result) { overlay.remove(); resolve(result); }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      overlay.querySelector('#confirm-cancel').addEventListener('click', () => close(false));
      overlay.querySelector('#confirm-ok').addEventListener('click', () => close(true));
    });
  }

  function alertDialog({ title, message }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/60 z-[110] flex items-end md:items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm">
          <h3 class="font-headline-md text-headline-md text-on-surface mb-2">${title}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant mb-6">${message}</p>
          <button id="alert-ok" class="w-full px-4 py-3 rounded-xl bg-surface-container-high text-primary font-body-md hover:bg-surface-bright transition-colors">OK</button>
        </div>`;
      document.body.appendChild(overlay);
      function close() { overlay.remove(); resolve(true); }
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      overlay.querySelector('#alert-ok').addEventListener('click', close);
    });
  }

  return { form, confirmDialog, alertDialog };
})();
