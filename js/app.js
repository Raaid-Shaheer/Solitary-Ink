// App shell: routes between views and wires the bottom nav + settings/backup.

const ROUTES = {
  home: () => Home.render(),
  journal: () => Journal.render(),
  habits: () => Habits.render(),
  traits: () => Traits.render(),
  lists: () => Lists.render(),
  zikr: () => Zikr.render(),
  exercises: () => Exercises.render()
};

function setActiveNav(route) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === route);
  });
}

function currentRoute() {
  const hash = (location.hash || '#home').replace('#', '');
  return ROUTES[hash] ? hash : 'home';
}

function navigate(route) {
  location.hash = route;
}

function renderRoute() {
  const route = currentRoute();
  setActiveNav(route);
  ROUTES[route]();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.route));
});

window.addEventListener('hashchange', renderRoute);
document.addEventListener('DOMContentLoaded', async () => {
  await AppLock.gate();
  renderRoute();
});

// --- Settings / backup ---

document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('nav-settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);

  const menuBtn = document.getElementById('nav-home-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => navigate('home'));

  const titleEl = document.getElementById('app-title');
  if (titleEl) titleEl.addEventListener('click', () => navigate('home'));
});

async function openSettings() {
  const existing = document.getElementById('settings-overlay');
  if (existing) { existing.remove(); return; }

  const lockCfg = await AppLock.getConfig();
  const bioAvailable = await AppLock.biometricAvailable();

  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 overflow-y-auto';
  overlay.innerHTML = `
    <div class="bg-surface-container-low rounded-t-xl md:rounded-xl p-6 w-full max-w-sm my-auto">
      <h3 class="font-headline-md text-headline-md text-on-surface mb-4">App Lock</h3>
      <div class="flex items-center justify-between mb-4">
        <span class="font-body-md text-body-md text-on-surface">Require PIN to open</span>
        <button id="lock-toggle-btn" class="w-12 h-7 rounded-full transition-colors relative ${lockCfg.enabled ? 'bg-primary' : 'bg-surface-container-highest'}">
          <span class="absolute top-0.5 ${lockCfg.enabled ? 'right-0.5' : 'left-0.5'} w-6 h-6 rounded-full bg-surface-container-lowest transition-all"></span>
        </button>
      </div>
      <div class="flex flex-col gap-3 mb-6">
        <button id="set-pin-btn" class="px-4 py-3 rounded-xl bg-surface-container-high text-primary font-body-md hover:bg-surface-bright transition-colors text-left">
          ${lockCfg.pinHash ? 'Change PIN' : 'Set a 4-digit PIN'}
        </button>
        ${bioAvailable ? `
          <div class="flex items-center justify-between px-1">
            <span class="font-body-md text-body-md text-on-surface">Biometric unlock</span>
            <button id="bio-toggle-btn" class="w-12 h-7 rounded-full transition-colors relative ${lockCfg.biometricEnabled ? 'bg-primary' : 'bg-surface-container-highest'}" ${lockCfg.pinHash ? '' : 'disabled'}>
              <span class="absolute top-0.5 ${lockCfg.biometricEnabled ? 'right-0.5' : 'left-0.5'} w-6 h-6 rounded-full bg-surface-container-lowest transition-all"></span>
            </button>
          </div>
          ${!lockCfg.pinHash ? `<p class="font-label-sm text-label-sm text-on-surface-variant/60">Set a PIN first as a fallback.</p>` : ''}
        ` : ''}
      </div>

      <div class="h-px bg-outline-variant/10 mb-6"></div>

      <h3 class="font-headline-md text-headline-md text-on-surface mb-4">Backup &amp; Data</h3>
      <p class="font-body-md text-body-md text-on-surface-variant mb-6">
        Everything you write lives only on this device. Export a backup regularly,
        especially before clearing browser data or switching devices.
      </p>
      <div class="flex flex-col gap-3">
        <button id="export-btn" class="px-4 py-3 rounded-xl bg-surface-container-high text-primary font-body-md hover:bg-surface-bright transition-colors">
          Export backup (.json)
        </button>
        <label class="px-4 py-3 rounded-xl border border-dashed border-outline-variant/40 text-on-surface-variant font-body-md text-center cursor-pointer hover:text-primary transition-colors">
          Import backup (.json)
          <input type="file" id="import-input" accept="application/json" class="hidden"/>
        </label>
        <button id="close-settings-btn" class="px-4 py-3 rounded-xl text-on-surface-variant font-body-md hover:text-primary transition-colors">
          Close
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('close-settings-btn').addEventListener('click', () => overlay.remove());

  document.getElementById('lock-toggle-btn').addEventListener('click', async () => {
    const cfg = await AppLock.getConfig();
    if (!cfg.enabled && !cfg.pinHash) {
      await Modal.alertDialog({ title: 'Set a PIN first', message: 'Set a PIN, then turn this on.' });
      return;
    }
    cfg.enabled = !cfg.enabled;
    await AppLock.saveConfig(cfg);
    overlay.remove();
    openSettings();
  });

  document.getElementById('set-pin-btn').addEventListener('click', () => {
    overlay.remove();
    setPinFlow();
  });

  const bioBtn = document.getElementById('bio-toggle-btn');
  if (bioBtn) {
    bioBtn.addEventListener('click', async () => {
      const cfg = await AppLock.getConfig();
      if (!cfg.biometricEnabled) {
        try {
          const credId = await AppLock.registerBiometric();
          cfg.biometricEnabled = true;
          cfg.credentialId = credId;
          await AppLock.saveConfig(cfg);
        } catch (e) {
          await Modal.alertDialog({ title: "Couldn't set up biometric unlock", message: 'Your PIN still works.' });
          return;
        }
      } else {
        cfg.biometricEnabled = false;
        cfg.credentialId = null;
        await AppLock.saveConfig(cfg);
      }
      overlay.remove();
      openSettings();
    });
  }

  document.getElementById('export-btn').addEventListener('click', async () => {
    const data = await DB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solitude-ink-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let data;
    try {
      const text = await file.text();
      data = JSON.parse(text);
    } catch (err) {
      await Modal.alertDialog({ title: "Can't read file", message: 'That file is not a valid backup.' });
      return;
    }

    const summary = await DB.previewImport(data);
    const lines = Object.entries(summary)
      .filter(([, s]) => s.added || s.updated || s.skipped)
      .map(([name, s]) => `${name}: +${s.added} new, ${s.updated} updated, ${s.skipped} kept as-is`);

    if (!lines.length) {
      await Modal.alertDialog({ title: 'Nothing to import', message: 'Nothing new was found in this file.' });
      return;
    }

    const ok = await Modal.confirmDialog({
      title: 'Merge this backup?',
      message: `The newer copy wins on any conflict:<br><br>${lines.join('<br>')}`,
      confirmLabel: 'Import',
      danger: false
    });
    if (!ok) return;

    await DB.importAll(data);
    await Modal.alertDialog({ title: 'Done', message: 'Import complete.' });
    overlay.remove();
    renderRoute();
  });
}

async function setPinFlow() {
  const values = await Modal.form({
    title: 'Set PIN',
    fields: [
      { key: 'pin1', label: 'New 4-digit PIN', type: 'number', placeholder: '1234' },
      { key: 'pin2', label: 'Confirm PIN', type: 'number', placeholder: '1234' }
    ],
    submitLabel: 'Set PIN'
  });
  if (!values) return;
  if (!/^\d{4}$/.test(values.pin1)) {
    await Modal.alertDialog({ title: 'Invalid PIN', message: 'Your PIN must be exactly 4 digits.' });
    return;
  }
  if (values.pin1 !== values.pin2) {
    await Modal.alertDialog({ title: "PINs didn't match", message: 'Try again.' });
    return;
  }
  const cfg = await AppLock.getConfig();
  cfg.pinHash = await AppLock.sha256Hex(values.pin1);
  cfg.enabled = true;
  await AppLock.saveConfig(cfg);
  await Modal.alertDialog({ title: 'PIN set', message: 'App Lock is now on.' });
  openSettings();
}
