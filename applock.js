// App Lock: a local PIN gate, with optional biometric unlock (Face/Touch/
// fingerprint) via the device's platform authenticator. Nothing here talks
// to a server — WebAuthn is used purely as a local "ask the OS to verify
// this person" gate, which is exactly what a personal local-only app needs.

const AppLock = (() => {
  const META_KEY = 'lockConfig';

  async function getConfig() {
    const rec = await DB.get('meta', META_KEY);
    return rec || { key: META_KEY, enabled: false, pinHash: null, biometricEnabled: false, credentialId: null };
  }

  async function saveConfig(cfg) {
    cfg.key = META_KEY;
    await DB.put('meta', cfg);
  }

  async function sha256Hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function bufToBase64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function base64ToBuf(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
  }

  async function biometricAvailable() {
    return !!(window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false));
  }

  async function registerBiometric() {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Solitude & Ink' },
        user: { id: userId, name: 'you', displayName: 'You' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000
      }
    });
    return bufToBase64(cred.rawId);
  }

  async function verifyBiometric(credentialIdB64) {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: base64ToBuf(credentialIdB64), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    // A resolved promise here means the platform authenticator verified
    // the person locally (fingerprint/face/PIN-to-OS). That's the gate.
    return true;
  }

  function isUnlockedThisSession() {
    return sessionStorage.getItem('solitude-ink-unlocked') === '1';
  }
  function markUnlocked() {
    sessionStorage.setItem('solitude-ink-unlocked', '1');
  }
  function markLocked() {
    sessionStorage.removeItem('solitude-ink-unlocked');
  }

  function pinPadHTML(title, subtitle) {
    return `
      <div class="fixed inset-0 bg-background z-[200] flex flex-col items-center justify-center px-container-padding" id="lock-screen">
        <span class="material-symbols-outlined text-primary mb-4" style="font-size:40px;">lock</span>
        <h2 class="font-headline-md text-headline-md text-on-surface mb-1">${title}</h2>
        <p class="font-body-md text-body-md text-on-surface-variant mb-8">${subtitle}</p>
        <div class="flex gap-3 mb-8" id="pin-dots">
          ${[0,1,2,3].map(i => `<div class="w-3 h-3 rounded-full border border-primary/40" data-dot="${i}"></div>`).join('')}
        </div>
        <p class="font-body-md text-body-md text-error mb-4 hidden" id="pin-error">Incorrect PIN</p>
        <div class="grid grid-cols-3 gap-4 mb-6" id="pin-pad">
          ${[1,2,3,4,5,6,7,8,9].map(n => `<button data-num="${n}" class="pin-key w-16 h-16 rounded-full bg-surface-container-low text-on-surface font-headline-md text-headline-md hover:bg-surface-container active:scale-95 transition-transform">${n}</button>`).join('')}
          <div></div>
          <button data-num="0" class="pin-key w-16 h-16 rounded-full bg-surface-container-low text-on-surface font-headline-md text-headline-md hover:bg-surface-container active:scale-95 transition-transform">0</button>
          <button id="pin-backspace" class="w-16 h-16 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-95 transition-transform">
            <span class="material-symbols-outlined">backspace</span>
          </button>
        </div>
        <button id="use-biometric-btn" class="hidden font-label-sm text-label-sm text-primary uppercase tracking-widest flex items-center gap-2">
          <span class="material-symbols-outlined" style="font-size:18px;">fingerprint</span> Use biometric unlock
        </button>
      </div>`;
  }

  // Shows the lock screen and resolves once the person is verified.
  async function promptUnlock(cfg) {
    return new Promise((resolve) => {
      const container = document.createElement('div');
      container.innerHTML = pinPadHTML('Locked', 'Enter your PIN to continue');
      document.body.appendChild(container.firstElementChild);
      const screen = document.getElementById('lock-screen');
      let entered = '';

      function updateDots() {
        screen.querySelectorAll('[data-dot]').forEach((d, i) => {
          d.classList.toggle('bg-primary', i < entered.length);
          d.classList.toggle('border-primary', i < entered.length);
        });
      }

      async function checkPin() {
        const hash = await sha256Hex(entered);
        if (hash === cfg.pinHash) {
          screen.remove();
          markUnlocked();
          resolve(true);
        } else {
          document.getElementById('pin-error').classList.remove('hidden');
          entered = '';
          updateDots();
          setTimeout(() => document.getElementById('pin-error')?.classList.add('hidden'), 1500);
        }
      }

      screen.querySelectorAll('.pin-key').forEach(btn => {
        btn.addEventListener('click', () => {
          if (entered.length >= 4) return;
          entered += btn.dataset.num;
          updateDots();
          if (entered.length === 4) checkPin();
        });
      });
      document.getElementById('pin-backspace').addEventListener('click', () => {
        entered = entered.slice(0, -1);
        updateDots();
      });

      if (cfg.biometricEnabled && cfg.credentialId) {
        const bioBtn = document.getElementById('use-biometric-btn');
        bioBtn.classList.remove('hidden');
        bioBtn.classList.add('flex');
        const tryBiometric = async () => {
          try {
            await verifyBiometric(cfg.credentialId);
            screen.remove();
            markUnlocked();
            resolve(true);
          } catch (e) {
            // cancelled or failed — fall back to PIN, no need to surface an error
          }
        };
        bioBtn.addEventListener('click', tryBiometric);
        // Offer biometric immediately on open, since it's the faster path.
        tryBiometric();
      }
    });
  }

  // Called once at boot. Resolves when the app is safe to render.
  async function gate() {
    const cfg = await getConfig();
    if (!cfg.enabled || !cfg.pinHash) return;
    if (isUnlockedThisSession()) return;
    await promptUnlock(cfg);
  }

  return {
    getConfig, saveConfig, sha256Hex, biometricAvailable,
    registerBiometric, verifyBiometric, markLocked, gate
  };
})();
