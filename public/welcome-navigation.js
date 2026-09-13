(() => {
  'use strict';

  const SECTION_IDS = new Set(['welcome-card', 'welcome-message', 'leave', 'auto-role']);

  function getTarget(id) {
    const target = document.getElementById(id);
    if (!target) return null;
    const editor = document.getElementById('editor');
    if (!editor || editor.classList.contains('hidden')) return null;
    if (!editor.contains(target)) return null;
    return target;
  }

  function openSection(id) {
    const target = getTarget(id);
    if (!target) return false;

    document.querySelectorAll('.nav-menu .nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });

    document.querySelectorAll('.dashboard-section-page').forEach(page => page.remove());

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    if (history.replaceState) history.replaceState(null, '', `#${id}`);
    return true;
  }

  window.proSulibraOpenWelcomeSection = openSection;

  document.addEventListener('click', event => {
    const link = event.target.closest('.nav-menu .nav-link');
    if (!link) return;
    const id = (link.getAttribute('href') || '').slice(1);
    if (!SECTION_IDS.has(id)) return;

    // Run before the older navigation handler and keep it from replacing the editor.
    event.preventDefault();
    event.stopImmediatePropagation();
    openSection(id);
  }, true);

  window.addEventListener('prosulibra:guild-selected', () => {
    setTimeout(() => {
      const id = (location.hash || '').slice(1);
      if (SECTION_IDS.has(id)) openSection(id);
    }, 100);
  });
})();
