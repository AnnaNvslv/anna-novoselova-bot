// mobile.js — нижняя навигация и патчи для Android
// Подключить в crm-v3.html последним скриптом, перед </body>:
//   <script src="mobile.js?v=1"></script>

(function () {
  if (window.innerWidth > 768) return; // только мобиле

  /* ── Нижняя навигация ── */
  const NAV_ITEMS = [
    {
      section: 'dashboard',
      label: 'Главная',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    },
    {
      section: 'slots',
      label: 'Расписание',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    },
    {
      section: 'appointments',
      label: 'Приёмы',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    },
    {
      section: 'patients',
      label: 'Пациенты',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    },
  ];

  const DRAWER_ITEMS = [
    {
      section: 'orders',
      label: 'Заказы',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
    },
    {
      section: 'analytics',
      label: 'Аналитика',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    },
    {
      section: 'settings',
      label: 'Настройки',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    },
    {
      section: 'trash',
      label: 'Корзина',
      icon: '<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
    },
  ];

  function buildNav() {
    if (document.getElementById('mobile-nav')) return;

    // Bottom nav bar
    const nav = document.createElement('div');
    nav.id = 'mobile-nav';
    nav.innerHTML =
      NAV_ITEMS.map(
        (item) =>
          `<button class="mob-nav-item" id="mob-nav-${item.section}"
              onclick="nav('${item.section}');_mobUpdateActive()">
            ${item.icon}<span>${item.label}</span>
          </button>`
      ).join('') +
      `<button id="mob-more-btn" onclick="_mobToggleDrawer()">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="22" height="22">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
        <span>Ещё</span>
      </button>`;
    document.body.appendChild(nav);

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'mob-drawer-overlay';
    overlay.onclick = _mobCloseDrawer;
    document.body.appendChild(overlay);

    // Drawer
    const curLang = localStorage.crm_lang || 'sr';
    const drawer = document.createElement('div');
    drawer.id = 'mob-drawer';
    drawer.innerHTML =
      DRAWER_ITEMS.map(
        (item) =>
          `<div class="mob-drawer-item"
              onclick="nav('${item.section}');_mobCloseDrawer();_mobUpdateActive()">
            ${item.icon} ${item.label}
          </div>`
      ).join('') +
      `<div class="mob-drawer-sep"></div>
      <div class="mob-drawer-lang">
        <span style="color:rgba(255,255,255,.5);font-size:12px;font-weight:600;margin-right:4px">Язык:</span>
        <button class="${curLang === 'sr' ? 'active' : ''}" onclick="switchLang('sr');_mobSyncLangBtns()">SRB</button>
        <button class="${curLang === 'ru' ? 'active' : ''}" onclick="switchLang('ru');_mobSyncLangBtns()">RUS</button>
      </div>
      <div class="mob-drawer-sep"></div>
      <div class="mob-drawer-item" onclick="logout();_mobCloseDrawer()" style="color:rgba(255,100,100,.9)">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="20" height="20">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Выйти
      </div>`;
    document.body.appendChild(drawer);

    _mobUpdateActive();
  }

  /* ── Глобальные хелперы (нужны inline onclick) ── */
  window._mobUpdateActive = function () {
    document.querySelectorAll('.mob-nav-item').forEach((btn) => {
      btn.classList.toggle(
        'active',
        btn.id === 'mob-nav-' + (window.curSection || 'dashboard')
      );
    });
  };

  window._mobToggleDrawer = function () {
    const d = document.getElementById('mob-drawer');
    const o = document.getElementById('mob-drawer-overlay');
    if (!d) return;
    const open = d.classList.toggle('open');
    o.classList.toggle('open', open);
  };

  window._mobCloseDrawer = function () {
    document.getElementById('mob-drawer')?.classList.remove('open');
    document.getElementById('mob-drawer-overlay')?.classList.remove('open');
  };

  window._mobSyncLangBtns = function () {
    const lang = localStorage.crm_lang || 'sr';
    document.querySelectorAll('.mob-drawer-lang button').forEach((btn, i) => {
      btn.classList.toggle('active', i === 0 ? lang === 'sr' : lang === 'ru');
    });
  };

  /* ── Патч showApp: инициализировать nav после логина ── */
  function patchShowApp() {
    const orig = window.showApp;
    if (typeof orig !== 'function') return;
    window.showApp = function (...args) {
      orig(...args);
      setTimeout(buildNav, 120);
    };
  }

  /* ── Патч renderSlots: оборачиваем cal-grid в scrollable wrapper ── */
  function patchRenderSlots() {
    const orig = window.renderSlots;
    if (typeof orig !== 'function') return;
    window.renderSlots = async function (...args) {
      await orig(...args);
      // wrap
      const grid = document.querySelector('.cal-grid');
      if (grid && !grid.parentElement.classList.contains('cal-grid-wrapper')) {
        const wrap = document.createElement('div');
        wrap.className = 'cal-grid-wrapper';
        grid.parentNode.insertBefore(wrap, grid);
        wrap.appendChild(grid);
      }
      _mobUpdateActive();
    };
  }

  /* ── Патч nav(): после перехода обновлять активный пункт ── */
  function patchNav() {
    const orig = window.nav;
    if (typeof orig !== 'function') return;
    window.nav = function (...args) {
      orig(...args);
      setTimeout(_mobUpdateActive, 50);
    };
  }

  /* ── Запуск ── */
  // Патчим сразу (функции могут быть уже объявлены)
  patchShowApp();
  patchRenderSlots();
  patchNav();

  // Если приложение уже показано (например, после перезагрузки с сохранённой сессией)
  if (document.getElementById('app') && document.getElementById('app').style.display !== 'none') {
    setTimeout(buildNav, 200);
  }

  // Fallback: слушаем момент когда app становится видимым
  const appEl = document.getElementById('app');
  if (appEl) {
    const obs = new MutationObserver(() => {
      if (appEl.style.display !== 'none') {
        buildNav();
        obs.disconnect();
      }
    });
    obs.observe(appEl, { attributes: true, attributeFilter: ['style'] });
  }
})();
