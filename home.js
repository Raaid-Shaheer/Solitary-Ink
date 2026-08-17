// Home dashboard: quiet overview tiles linking into each section.

const Home = (() => {
  function formatDisplayDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  async function journalStat() {
    const all = await DB.getAll('journalEntries');
    const count = all.filter(e =>
      (e.summary && e.summary.trim()) ||
      (e.hours && Object.values(e.hours).some(v => v && v.trim()))
    ).length;
    return count ? `${count} day${count === 1 ? '' : 's'} journaled` : 'Not started';
  }

  async function habitsStat() {
    const all = await DB.getAll('habits');
    const daily = all.filter(h => h.frequency === 'daily');
    if (!daily.length) return 'None yet';
    const logged = daily.filter(h => h.count > 0).length;
    return `${logged}/${daily.length} logged`;
  }

  async function traitsStat() {
    const all = await DB.getAll('traits');
    if (!all.length) return 'None yet';
    return `${all.length} insight${all.length === 1 ? '' : 's'}`;
  }

  async function listsStat() {
    const all = await DB.getAll('listItems');
    if (!all.length) return 'None yet';
    return `${all.length} item${all.length === 1 ? '' : 's'}`;
  }

  async function zikrStat() {
    const all = await DB.getAll('zikrs');
    if (!all.length) return 'None yet';
    const active = all.filter(z => z.target && z.count < z.target).length;
    return `${active} target${active === 1 ? '' : 's'} active`;
  }

  function tile({ route, icon, title, stat, spanFull }) {
    return `
      <button data-route="${route}" class="home-tile group bg-surface-container p-6 rounded-xl border border-outline-variant/10 hover:bg-surface-container-high transition-colors active:scale-[0.98] flex flex-col justify-between h-40 text-left ${spanFull ? 'md:col-span-2' : ''}">
        <div class="flex justify-between items-start">
          <span class="material-symbols-outlined text-primary text-3xl">${icon}</span>
          <span class="font-label-sm text-label-sm text-on-surface-variant bg-surface-variant px-2 py-1 rounded">${stat}</span>
        </div>
        <div>
          <h3 class="font-headline-md text-headline-md text-on-surface mb-1">${title}</h3>
          <div class="w-12 h-px bg-primary/30 group-hover:w-full transition-all duration-300"></div>
        </div>
      </button>`;
  }

  async function render() {
    const [jStat, hStat, tStat, lStat, zStat] = await Promise.all([
      journalStat(), habitsStat(), traitsStat(), listsStat(), zikrStat()
    ]);
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';

    const app = document.getElementById('app-content');
    app.innerHTML = `
      <section class="mb-section-margin text-center pt-2">
        <p class="font-label-sm text-label-sm text-outline tracking-wider uppercase mb-2">${greeting}</p>
        <h1 class="font-display-date text-display-date text-on-surface">${formatDisplayDate(now)}</h1>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-2 gap-element-gap mb-section-margin">
        ${tile({ route: 'journal', icon: 'auto_stories', title: 'Journal', stat: jStat })}
        ${tile({ route: 'traits', icon: 'cognition', title: 'Traits', stat: tStat })}
        ${tile({ route: 'lists', icon: 'format_list_bulleted', title: 'Lists', stat: lStat })}
        ${tile({ route: 'habits', icon: 'check_circle', title: 'Habits', stat: hStat })}
        ${tile({ route: 'zikr', icon: 'settings_heart', title: 'Zikr', stat: zStat, spanFull: true })}
      </section>
    `;

    document.querySelectorAll('.home-tile').forEach(btn =>
      btn.addEventListener('click', () => navigate(btn.dataset.route)));
  }

  return { render };
})();
