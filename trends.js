// Shared history/trend helpers for Habits and Zikr. Each entity (habit or
// zikr) carries its own `history` object: { 'YYYY-MM-DD': countAtEndOfDay }.
// Snapshots are taken on every count change, overwriting today's entry, and
// pruned to the last 60 days so records don't grow unbounded.

const HISTORY_DAYS_KEPT = 60;

function recordHistorySnapshot(entity, count) {
  entity.history = entity.history || {};
  entity.history[todayKey()] = count;
  const keys = Object.keys(entity.history).sort();
  if (keys.length > HISTORY_DAYS_KEPT) {
    keys.slice(0, keys.length - HISTORY_DAYS_KEPT).forEach(k => delete entity.history[k]);
  }
}

function lastNDays(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    out.push(todayKey(day));
  }
  return out;
}

// Renders a simple bar sparkline. `history` is {date: count}. `target`, if
// given, scales bar height as a fraction of target (capped at 100%);
// otherwise scales relative to the max value in the shown range.
function renderSparkline(history, days, target) {
  const dateKeys = lastNDays(days);
  const values = dateKeys.map(k => (history && history[k]) || 0);
  const max = target || Math.max(1, ...values);
  const bars = dateKeys.map((k, i) => {
    const v = values[i];
    const pct = Math.max(4, Math.min(100, Math.round((v / max) * 100)));
    const d = new Date(k + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday: 'narrow' });
    const isToday = k === todayKey();
    return `
      <div class="flex flex-col items-center gap-1 flex-1">
        <div class="w-full flex items-end justify-center" style="height:64px;">
          <div class="w-2.5 rounded-full ${isToday ? 'bg-primary' : 'bg-outline-variant/40'}" style="height:${pct}%;" title="${k}: ${v}"></div>
        </div>
        <span class="font-label-sm text-label-sm text-on-surface-variant/50" style="font-size:9px;">${label}</span>
      </div>`;
  }).join('');
  return `<div class="flex items-end gap-1 w-full">${bars}</div>`;
}
