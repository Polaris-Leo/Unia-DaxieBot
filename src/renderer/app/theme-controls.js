(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.DaxieApp ||= {}, api);
})(typeof window !== 'undefined' ? window : null, function () {
  function normalizeTheme(value) {
    return value === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(document, value) {
    const theme = normalizeTheme(value);
    document.documentElement.dataset.theme = theme;
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    }
    return theme;
  }

  function installThemeControls(document, api) {
    for (const button of document.querySelectorAll('[data-theme-choice]')) {
      button.onclick = async () => {
        const appearance = await api.setTheme(button.dataset.themeChoice);
        applyTheme(document, appearance.theme);
      };
    }
  }

  return { normalizeTheme, applyTheme, installThemeControls };
});
