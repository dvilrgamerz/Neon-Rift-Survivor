/* Neon Rift Survivor V4.3 — UI polish helpers */
(() => {
  const V4 = window.NeonV4;
  if (!V4) return;

  const $ = (id) => document.getElementById(id);
  const setText = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value || '—';
  };

  function syncQuickSummary() {
    const save = V4.save;
    if (!save?.selected) return;
    const op = V4.operators?.[save.selected.operator];
    const arena = V4.arenas?.[save.selected.arena];
    const mode = V4.runModes?.[save.selected.runMode];
    setText('quickOperator', op?.name || save.selected.operator);
    setText('quickArena', arena?.name || save.selected.arena);
    setText('quickRunMode', mode?.name || save.selected.runMode);

    const difficulty = document.querySelector('#modeLabel')?.textContent?.replace('SELECTED: ', '') || 'STANDARD';
    setText('quickDifficulty', difficulty);
  }

  function openLoadout() {
    document.querySelector('[data-v4tab="loadout"]')?.click();
  }

  function setup() {
    syncQuickSummary();

    document.querySelectorAll('[data-open-loadout]').forEach((el) => {
      el.addEventListener('click', openLoadout);
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('.v4-select,.mode-btn,#resetCustom')) {
        requestAnimationFrame(syncQuickSummary);
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target.closest('#customSettings')) requestAnimationFrame(syncQuickSummary);
    });

    document.addEventListener('keydown', (event) => {
      const loadoutTarget = event.target.closest?.('[data-open-loadout][role="button"]');
      if (loadoutTarget && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        openLoadout();
        return;
      }

      if (event.key !== 'Escape') return;
      const modal = $('v4Modal');
      if (modal && !modal.classList.contains('hide')) {
        modal.classList.add('hide');
        document.querySelector('[data-v4tab="loadout"]')?.focus();
      }
    });

    const modeLabel = $('modeLabel');
    if (modeLabel) {
      new MutationObserver(syncQuickSummary).observe(modeLabel, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    window.addEventListener('storage', syncQuickSummary);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
})();
