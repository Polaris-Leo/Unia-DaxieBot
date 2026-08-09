(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.DaxieApp ||= {}, api);
})(typeof window !== 'undefined' ? window : null, function () {
  function collectConfig(document, configIds) {
    const config = {};
    for (const id of configIds) {
      const element = document.getElementById(id);
      if (id === 'fontFamily') {
        config.fontFamily = element.selectedOptions[0]?.dataset.family || 'Microsoft YaHei';
        config.fontSourceId = element.selectedOptions[0]?.dataset.source || '';
      } else if (element.type === 'checkbox') config[id] = element.checked;
      else if (element.type === 'number' || element.type === 'range') config[id] = Number(element.value);
      else config[id] = element.value;
    }
    return config;
  }

  return { collectConfig };
});
