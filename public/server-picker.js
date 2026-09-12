(() => {
  const picker = document.getElementById('server-picker');
  if (!picker) return;

  const style = document.createElement('style');
  style.textContent = `
    #server-picker { position: relative; cursor: pointer; user-select: none; }
    .server-picker-menu {
      position: absolute; top: calc(100% + 10px); right: 0; width: min(380px, calc(100vw - 32px));
      max-height: 430px; overflow-y: auto; padding: 8px; z-index: 10000;
      background: rgba(15,23,42,.98); border: 1px solid rgba(148,163,184,.18);
      border-radius: 16px; box-shadow: 0 18px 50px rgba(0,0,0,.4); display: none;
      backdrop-filter: blur(16px);
    }
    .server-picker-menu.open { display: block; }
    .server-picker-loading, .server-picker-empty, .server-picker-error { padding: 18px; text-align: center; color: #94a3b8; font-size: 14px; }
    .server-picker-item {
      width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px;
      border: 0; background: transparent; color: #fff; border-radius: 12px; cursor: pointer; text-align: right;
    }
    .server-picker-item:hover, .server-picker-item.active { background: rgba(99,102,241,.16); }
    .server-picker-icon { width: 42px; height: 42px; border-radius: 12px; flex: 0 0 42px; display: grid; place-items: center; overflow: hidden; background: #273449; font-weight: 800; }
    .server-picker-icon img { width: 100%; height: 100%; object-fit: cover; }
    .server-picker-copy { min-width: 0; flex: 1; }
    .server-picker-copy b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .server-picker-copy small { display: block; margin-top: 3px; color: #94a3b8; }
    .server-picker-check { color: #8b5cf6; font-weight: 900; }
    .server-picker-head { padding: 8px 10px 10px; color: #cbd5e1; font-size: 13px; font-weight: 700; }
  `;
  document.head.appendChild(style);

  const menu = document.createElement('div');
  menu.className = 'server-picker-menu';
  menu.innerHTML = '<div class="server-picker-head">اختار السيرفر اللي بغيتي تدير ليه الإعدادات</div><div class="server-picker-loading">جاري تحميل السيرفرات...</div>';
  picker.appendChild(menu);

  let guilds = [];
  let loaded = false;
  let selectedId = null;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function loadServers() {
    try {
      const response = await fetch('/api/guilds', { credentials: 'same-origin' });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || 'failed_to_load_guilds');
      guilds = Array.isArray(data) ? data : [];
      loaded = true;
      render();
    } catch (error) {
      menu.innerHTML = '<div class="server-picker-head">اختيار السيرفر</div><div class="server-picker-error">تعذر تحميل السيرفرات. عاود تسجيل الدخول.</div>';
    }
  }

  function render() {
    if (!guilds.length) {
      menu.innerHTML = '<div class="server-picker-head">اختيار السيرفر</div><div class="server-picker-empty">ما عندك حتى سيرفر عندك فيه صلاحية الإدارة.</div>';
      return;
    }
    menu.innerHTML = '<div class="server-picker-head">سيرفراتك القابلة للإدارة</div>' + guilds.map(g => {
      const icon = g.icon
        ? `<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=96" alt="">`
        : escapeHtml((g.name || '?').slice(0, 1));
      const status = g.botPresent ? 'البوت موجود • قابل للتخصيص' : 'البوت مازال ما دخلش';
      return `<button type="button" class="server-picker-item ${selectedId === g.id ? 'active' : ''}" data-guild-id="${escapeHtml(g.id)}"><span class="server-picker-icon">${icon}</span><span class="server-picker-copy"><b>${escapeHtml(g.name)}</b><small>${status}</small></span>${selectedId === g.id ? '<span class="server-picker-check">✓</span>' : ''}</button>`;
    }).join('');

    menu.querySelectorAll('.server-picker-item').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        const id = button.dataset.guildId;
        selectedId = id;
        const guild = guilds.find(g => g.id === id);
        if (guild) picker.firstChild.textContent = `◈ ${guild.name} `;
        menu.classList.remove('open');
        if (typeof window.selectGuild === 'function') {
          await window.selectGuild(id);
          render();
        }
      });
    });
  }

  picker.addEventListener('click', async event => {
    event.stopPropagation();
    menu.classList.toggle('open');
    if (!loaded) await loadServers();
  });

  document.addEventListener('click', () => menu.classList.remove('open'));

  window.addEventListener('prosulibra:guild-selected', event => {
    selectedId = event.detail?.id || null;
    render();
  });

  loadServers();
})();
