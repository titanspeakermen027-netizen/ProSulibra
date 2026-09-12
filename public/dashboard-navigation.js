(() => {
  'use strict';

  const state = { section: 'top' };
  const sectionData = {
    general: {
      icon: '⚙',
      title: 'الإعدادات العامة',
      subtitle: 'إعدادات أساسية للتحكم في سلوك ProSulibra داخل السيرفر.',
      cards: [
        ['حالة الترحيب', 'تحكم في تشغيل نظام الترحيب ورسائل الانضمام من محرر Welcome Card.'],
        ['إعدادات السيرفر', 'اختار السيرفر من القائمة الجانبية باش تظهر إعداداته وتقدر تعدلها بدون مغادرة الصفحة.'],
        ['حفظ تلقائي', 'التغييرات كتظل محلية في النموذج حتى تضغط على زر حفظ التغييرات.']
      ]
    },
    manage: {
      icon: '▣',
      title: 'إدارة السيرفر',
      subtitle: 'أدوات الإدارة الأساسية المرتبطة بالسيرفر المحدد.',
      cards: [
        ['القنوات', 'عرض القنوات المتاحة التي يمكن استعمالها مع أنظمة الترحيب والمغادرة.'],
        ['الرتب', 'عرض الرتب المتاحة لاختيار رتبة تلقائية للعضو الجديد.'],
        ['صلاحيات البوت', 'تأكد من أن البوت داخل السيرفر وأن عنده الصلاحيات المطلوبة قبل الحفظ.']
      ]
    },
    stats: {
      icon: '▥',
      title: 'الإحصائيات',
      subtitle: 'نظرة سريعة على حالة السيرفر والبوت.',
      cards: [
        ['أعضاء السيرفر', 'العدد الحالي للأعضاء كيتم أخذه من Discord مباشرة عند اختيار السيرفر.'],
        ['حالة البوت', 'البوت Online ويمكنك متابعة حالته من مؤشر الحالة في الشريط الجانبي.'],
        ['الاتصال', 'البيانات الخاصة بالسيرفر كتتحمل عبر API بدون إعادة تحميل الصفحة.']
      ]
    },
    logs: {
      icon: '▤',
      title: 'السجلات',
      subtitle: 'مكان مخصص لعرض أحداث لوحة التحكم وأنظمة الترحيب.',
      cards: [
        ['تغييرات الإعدادات', 'واجهة السجلات جاهزة لاستقبال أحداث الحفظ والتعديل في الإصدارات القادمة.'],
        ['أحداث الترحيب', 'يمكن تتبع عمليات الترحيب والمغادرة بعد تفعيل نظام السجلات في البوت.'],
        ['حالة النظام', 'الأخطاء التي تظهر في API يمكن تشخيصها من سجلات الخادم بدون التأثير على التنقل.']
      ]
    },
    bot: {
      icon: '⚙',
      title: 'إعدادات البوت',
      subtitle: 'معلومات وإعدادات عامة خاصة بتشغيل ProSulibra.',
      cards: [
        ['حالة التشغيل', 'ProSulibra متصل بـ Discord ويمكنك استعمال لوحة التحكم أثناء تشغيل البوت.'],
        ['Dashboard', 'تصفح الإعدادات يتم داخل نفس الصفحة وبدون إعادة تحميل.'],
        ['OAuth2', 'تسجيل الدخول يتم عبر Discord، والجلسة الحالية تبقى محفوظة أثناء التنقل.']
      ]
    }
  };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function getEditor() { return document.getElementById('editor'); }
  function getEmpty() { return document.getElementById('empty'); }

  function setActive(link) {
    document.querySelectorAll('.nav-menu .nav-link').forEach(item => item.classList.remove('active'));
    if (link) link.classList.add('active');
  }

  function setHash(id) {
    if (history.replaceState) history.replaceState(null, '', `#${id}`);
  }

  function showWelcomeTarget(id) {
    const target = document.getElementById(id);
    if (!target) return false;
    state.section = id;
    document.querySelectorAll('.dashboard-section-page').forEach(el => el.classList.add('hidden'));
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHash(id);
    return true;
  }

  function renderSection(key) {
    const data = sectionData[key];
    if (!data) return;

    const empty = getEmpty();
    const editor = getEditor();
    if (!editor) return;

    document.querySelectorAll('.dashboard-section-page').forEach(el => el.remove());
    if (empty) empty.classList.add('hidden');
    editor.classList.remove('hidden');

    const page = document.createElement('div');
    page.className = 'dashboard-section-page';
    page.dataset.section = key;
    page.innerHTML = `
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
          <div><h2>التنقل السريع</h2><p>تقدر ترجع لأي جزء من الـDashboard مباشرة بلا Reload.</p></div>
        </div>
        <div class="quick-actions">
          <button type="button" class="secondary quick-welcome">محرر كارت الترحيب</button>
          <button type="button" class="secondary quick-message">رسالة الترحيب</button>
          <button type="button" class="secondary quick-leave">رسالة المغادرة</button>
          <button type="button" class="secondary quick-role">الرتب التلقائية</button>
        </div>
      </div>
    `;

    editor.appendChild(page);
    state.section = key;
    setHash(key);
    bindInternalButtons(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindInternalButtons(root) {
    root.querySelector('.nav-back-welcome')?.addEventListener('click', () => activate('welcome-card'));
    root.querySelector('.quick-welcome')?.addEventListener('click', () => activate('welcome-card'));
    root.querySelector('.quick-message')?.addEventListener('click', () => activate('welcome-message'));
    root.querySelector('.quick-leave')?.addEventListener('click', () => activate('leave'));
    root.querySelector('.quick-role')?.addEventListener('click', () => activate('auto-role'));
  }

  function activate(id) {
    const link = document.querySelector(`.nav-menu .nav-link[href="#${CSS.escape(id)}"]`);
    if (link) setActive(link);

    if (['welcome-card', 'welcome-message', 'leave', 'auto-role'].includes(id)) {
      const editor = getEditor();
      const hasEditor = editor && !editor.classList.contains('hidden') && editor.querySelector('.page-head');
      if (!hasEditor) {
        const welcomeLink = document.querySelector('.nav-menu .nav-link[href="#welcome-card"]');
        if (welcomeLink) setActive(welcomeLink);
        setHash(id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      document.querySelectorAll('.dashboard-section-page').forEach(el => el.remove());
      showWelcomeTarget(id);
      return;
    }

    if (id === 'top') {
      document.querySelectorAll('.dashboard-section-page').forEach(el => el.remove());
      if (getEmpty() && !getEditor()?.querySelector('.page-head')) getEmpty().classList.remove('hidden');
      setHash('top');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    renderSection(id);
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-menu .nav-link').forEach(link => {
      if (link.dataset.navigationBound) return;
      link.dataset.navigationBound = '1';
      link.addEventListener('click', event => {
        event.preventDefault();
        const id = (link.getAttribute('href') || '#top').slice(1) || 'top';
        activate(id);
      });
    });

    document.querySelector('.nav-group-title')?.addEventListener('click', () => {
      document.querySelector('.nav-group')?.classList.toggle('collapsed');
    });
  }

  function bindDynamicNavigation() {
    bindNavigation();
    const observer = new MutationObserver(() => bindNavigation());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function restoreFromHash() {
    const id = (location.hash || '#top').slice(1);
    if (!id) return;
    setTimeout(() => activate(id), 150);
  }

  function addStyles() {
    if (document.getElementById('prosulibra-navigation-style')) return;
    const style = document.createElement('style');
    style.id = 'prosulibra-navigation-style';
    style.textContent = `
      .dashboard-section-page{animation:prosulibraFade .18s ease both}
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
    script.src = '/server-picker.js';
    script.defer = true;
    script.dataset.serverPicker = '1';
    document.body.appendChild(script);
  }

  function init() {
    addStyles();
    bindDynamicNavigation();
    loadServerPicker();
    restoreFromHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
