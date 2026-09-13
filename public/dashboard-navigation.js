(() => {
  'use strict';

  const WELCOME_SECTIONS = new Set(['welcome-card', 'welcome-message', 'leave', 'auto-role']);
  const state = { section: 'top' };

  const sectionData = {
    general: {
      icon: '⚙', title: 'الإعدادات العامة',
      subtitle: 'إعدادات أساسية للتحكم في سلوك ProSulibra داخل السيرفر.',
      cards: [
        ['حالة الترحيب', 'تحكم في تشغيل نظام الترحيب ورسائل الانضمام من محرر Welcome Card.'],
        ['إعدادات السيرفر', 'اختار السيرفر من القائمة الجانبية باش تظهر إعداداته وتقدر تعدلها بدون مغادرة الصفحة.'],
        ['حفظ التغييرات', 'التغييرات كتتحفظ من زر حفظ التغييرات داخل محرر الترحيب.']
      ]
    },
    manage: {
      icon: '▣', title: 'إدارة السيرفر',
      subtitle: 'معلومات الإدارة المرتبطة بالسيرفر المحدد.',
      cards: [
        ['القنوات', 'القنوات النصية القابلة للاستعمال مع أنظمة الترحيب والمغادرة.'],
        ['الرتب', 'الرتب المتاحة للـ Auto Role كتتحمل مباشرة من Discord.'],
        ['صلاحيات البوت', 'تأكد أن البوت داخل السيرفر وعنده الصلاحيات المطلوبة.']
      ]
    },
    stats: {
      icon: '▥', title: 'الإحصائيات',
      subtitle: 'نظرة سريعة على حالة السيرفر والبوت.',
      cards: [
        ['أعضاء السيرفر', 'العدد الحالي للأعضاء كيتم أخذه مباشرة عند اختيار السيرفر.'],
        ['حالة البوت', 'الحالة الحالية للبوت ظاهرة في الشريط الجانبي.'],
        ['الاتصال', 'البيانات كتتحمل عبر API بدون إعادة تحميل الصفحة.']
      ]
    },
    logs: {
      icon: '▤', title: 'السجلات',
      subtitle: 'واجهة مخصصة للسجلات والأحداث.',
      cards: [
        ['تغييرات الإعدادات', 'مكان مخصص لأحداث الحفظ والتعديل.'],
        ['أحداث الترحيب', 'مكان مخصص لأحداث الانضمام والمغادرة.'],
        ['حالة النظام', 'يمكن استعمالها لتشخيص أخطاء API والبوت.']
      ]
    },
    bot: {
      icon: '⚙', title: 'إعدادات البوت',
      subtitle: 'معلومات عامة على تشغيل ProSulibra.',
      cards: [
        ['حالة التشغيل', 'ProSulibra متصل بـ Discord.'],
        ['Dashboard', 'التنقل يتم داخل نفس الصفحة بدون تدمير محرر الترحيب.'],
        ['OAuth2', 'الجلسة الحالية كتظل محفوظة أثناء التنقل.']
      ]
    }
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function editor() { return document.getElementById('editor'); }
  function empty() { return document.getElementById('empty'); }

  function setHash(id) {
    const next = `#${id}`;
    if (location.hash !== next) history.replaceState(null, '', next);
  }

  function setActive(id) {
    document.querySelectorAll('.nav-menu .nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
    });
  }

  function getNavigationLayer() {
    let layer = document.getElementById('navigation-layer');
    if (layer) return layer;

    const content = document.querySelector('.content');
    if (!content) return null;
    layer = document.createElement('div');
    layer.id = 'navigation-layer';
    layer.className = 'hidden';
    content.appendChild(layer);
    return layer;
  }

  function hideNavigationLayer() {
    const layer = getNavigationLayer();
    if (layer) {
      layer.classList.add('hidden');
      layer.innerHTML = '';
    }
  }

  function showWelcomeTarget(id) {
    const ed = editor();
    if (!ed || ed.classList.contains('hidden')) return false;

    const target = document.getElementById(id);
    if (!target) return false;

    hideNavigationLayer();
    if (empty()) empty().classList.add('hidden');
    ed.classList.remove('hidden');
    state.section = id;
    setActive(id);
    setHash(id);

    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return true;
  }

  function renderSection(key) {
    const data = sectionData[key];
    if (!data) return;

    const layer = getNavigationLayer();
    if (!layer) return;

    // IMPORTANT: Never replace #editor.innerHTML here. The welcome editor contains
    // unsaved form values and all its controls, so destructive rendering makes
    // every Welcome Card option appear to disappear.
    layer.classList.remove('hidden');
    layer.innerHTML = `
      <div class="dashboard-section-page">
        <div class="page-head">
          <div>
            <div class="eyebrow"><span>${data.icon}</span> ProSulibra</div>
            <h1>${esc(data.title)}</h1>
            <p>${esc(data.subtitle)}</p>
          </div>
          <div class="head-actions">
            <button type="button" class="secondary nav-back-welcome">✦ Welcome Card</button>
          </div>
        </div>
        <div class="dashboard-info-grid">
          ${data.cards.map(([title, text], index) => `
            <article class="dashboard-info-card">
              <div class="info-card-icon">${index === 0 ? data.icon : index === 1 ? '◈' : '✓'}</div>
              <h2>${esc(title)}</h2>
              <p>${esc(text)}</p>
            </article>
          `).join('')}
        </div>
        <div class="dashboard-info-card wide-card">
          <div class="section-header">
            <div class="section-icon">✓</div>
            <div><h2>التنقل السريع</h2><p>بدّل بين أقسام الترحيب بدون حذف محرر السيرفر.</p></div>
          </div>
          <div class="quick-actions">
            <button type="button" class="secondary quick-welcome">محرر كارت الترحيب</button>
            <button type="button" class="secondary quick-message">رسالة الترحيب</button>
            <button type="button" class="secondary quick-leave">رسالة المغادرة</button>
            <button type="button" class="secondary quick-role">الرتب التلقائية</button>
          </div>
        </div>
      </div>
    `;

    layer.querySelector('.nav-back-welcome')?.addEventListener('click', () => activate('welcome-card'));
    layer.querySelector('.quick-welcome')?.addEventListener('click', () => activate('welcome-card'));
    layer.querySelector('.quick-message')?.addEventListener('click', () => activate('welcome-message'));
    layer.querySelector('.quick-leave')?.addEventListener('click', () => activate('leave'));
    layer.querySelector('.quick-role')?.addEventListener('click', () => activate('auto-role'));

    state.section = key;
    setActive(key);
    setHash(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function activate(id) {
    if (WELCOME_SECTIONS.has(id)) {
      const ok = showWelcomeTarget(id);
      if (ok) return;

      // No selected server/editor yet. Keep the dashboard intact and simply
      // remember the requested section until a server is selected.
      state.section = id;
      setActive(id);
      setHash(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (id === 'top') {
      hideNavigationLayer();
      state.section = 'top';
      if (empty() && editor()?.classList.contains('hidden')) empty().classList.remove('hidden');
      setActive('top');
      setHash('top');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    renderSection(id);
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-menu .nav-link').forEach(link => {
      if (link.dataset.navigationBound === '1') return;
      link.dataset.navigationBound = '1';
      link.addEventListener('click', event => {
        event.preventDefault();
        const id = (link.getAttribute('href') || '#top').slice(1) || 'top';
        activate(id);
      });
    });

    const groupTitle = document.querySelector('.nav-group-title');
    if (groupTitle && groupTitle.dataset.navigationBound !== '1') {
      groupTitle.dataset.navigationBound = '1';
      groupTitle.addEventListener('click', () => {
        document.querySelector('.nav-group')?.classList.toggle('collapsed');
      });
    }
  }

  function addStyles() {
    if (document.getElementById('prosulibra-navigation-style')) return;
    const style = document.createElement('style');
    style.id = 'prosulibra-navigation-style';
    style.textContent = `
      #navigation-layer{width:100%;margin-top:22px}
      #navigation-layer.hidden{display:none!important}
      #navigation-layer .dashboard-section-page{animation:prosulibraFade .18s ease both}
      .dashboard-info-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:22px}
      .dashboard-info-card{background:var(--panel,#111827);border:1px solid rgba(148,163,184,.14);border-radius:18px;padding:22px;box-shadow:0 12px 32px rgba(0,0,0,.12)}
      .dashboard-info-card h2{margin:10px 0 8px;font-size:18px}.dashboard-info-card p{margin:0;color:#94a3b8;line-height:1.8}
      .info-card-icon{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(88,101,242,.14);font-size:20px}
      .wide-card{margin-top:18px}.quick-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
      .nav-group-title{cursor:pointer}.nav-group.collapsed .sub{display:none}
      @keyframes prosulibraFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      @media(max-width:900px){.dashboard-info-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function loadServerPicker() {
    if (document.querySelector('script[data-server-picker]')) return;
    const script = document.createElement('script');
    script.src = '/server-picker.js?v=3';
    script.defer = true;
    script.dataset.serverPicker = '1';
    document.body.appendChild(script);
  }

  function init() {
    addStyles();
    bindNavigation();
    loadServerPicker();
    const id = (location.hash || '').slice(1);
    if (id) setTimeout(() => activate(id), 150);
  }

  // Expose a single navigation entry point for server-picker.js and inline UI.
  window.proSulibraNavigate = activate;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
