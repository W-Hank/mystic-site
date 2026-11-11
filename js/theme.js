/* 主题切换：◐ 跟随系统 / ☀ 浅色 / ☾ 深色
   存储键 mystic-theme；存图会读取当前主题色，所以换主题后导出的图也跟着变 */
(function () {
  var KEY = 'mystic-theme';
  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: light)');
  var btn = document.getElementById('themeToggle');
  var ICON = { auto: '◐', light: '☀', dark: '☾' };
  var NEXT = { auto: 'light', light: 'dark', dark: 'auto' };

  /* 支持 ?theme=light / ?theme=dark 临时覆盖，方便分享与截图，不写 localStorage */
  function urlMode() {
    try {
      var p = new URLSearchParams(location.search).get('theme');
      return (p === 'light' || p === 'dark') ? p : null;
    } catch (e) { return null; }
  }

  function saved() {
    var u = urlMode();
    if (u) return u;
    try {
      var v = localStorage.getItem(KEY);
      /* 默认深色：没存过选择就按深色走，不再跟随系统 */
      return (v === 'light' || v === 'dark' || v === 'auto') ? v : 'dark';
    } catch (e) { return 'dark'; }
  }

  function resolve(mode) {
    return mode === 'auto' ? (mq.matches ? 'light' : 'dark') : mode;
  }

  function apply(mode) {
    var t = resolve(mode);
    root.setAttribute('data-theme', t);
    root.setAttribute('data-theme-mode', mode);
    if (btn) {
      btn.textContent = ICON[mode];
      btn.setAttribute('title',
        mode === 'auto' ? '跟随系统（点击切浅色）'
        : mode === 'light' ? '浅色（点击切深色）'
        : '深色（点击切跟随系统）');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var bg = getComputedStyle(root).getPropertyValue('--ink').trim();
      if (bg) meta.setAttribute('content', bg);
    }
    // 通知存图模块重新取色
    window.dispatchEvent(new CustomEvent('mystic-theme-change', { detail: { theme: t, mode: mode } }));
  }

  function setMode(mode) {
    try {
      if (mode === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch (e) {}
    apply(mode);
  }

  if (btn) {
    btn.addEventListener('click', function () {
      setMode(NEXT[saved()] || 'light');
    });
  }

  mq.addEventListener('change', function () {
    if (saved() === 'auto') apply('auto');
  });

  apply(saved());
})();

/* 给 canvas / SVG 用：读当前主题变量 */
window.MysticTheme = {
  v: function (name, fallback) {
    try {
      var x = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
      return x || fallback;
    } catch (e) { return fallback; }
  }
};
