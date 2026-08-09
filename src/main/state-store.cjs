const fs = require('fs');
const path = require('path');

function createStateStore({ dataFile, initialState = {}, normalizeConfig = value => value, publicFont = value => value, onBroadcast = () => {} }) {
  let state = { ...initialState, config: normalizeConfig(initialState.config || {}) };

  function getState() { return state; }
  function publicState() {
    const { cookies, ...safe } = state;
    return { ...safe, importedFonts: (safe.importedFonts || []).map(publicFont) };
  }
  function save() {
    if (!dataFile) return;
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
  }
  function patch(values, { persist = true, broadcast = true } = {}) {
    state = { ...state, ...values };
    if (persist) save();
    if (broadcast) onBroadcast(publicState());
    return state;
  }
  function updateConfig(values) {
    return patch({ config: normalizeConfig({ ...state.config, ...values }) }).config;
  }

  return { getState, publicState, save, patch, updateConfig };
}

module.exports = { createStateStore };
