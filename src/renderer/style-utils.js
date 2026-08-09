(function exposeStyleUtils(globalScope) {
  const pathExtension = value => String(value || '').toLowerCase().match(/\.[^.\\/]+$/)?.[0] || '';

  function isSupportedFontExtension(file) {
    return ['.ttf','.otf','.woff','.woff2'].includes(pathExtension(file));
  }

  function parseLegacyColor(value, fallback) {
    const text = String(value || '').trim();
    const hex = text.match(/^#([0-9a-f]{6})$/i);
    if (hex) return { hex: `#${hex[1].toLowerCase()}`, opacity: 100 };
    const rgba = text.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (!rgba) return fallback;
    const channels = rgba.slice(1,4).map(item => Math.max(0, Math.min(255, Number(item))));
    const alpha = rgba[4] == null ? 1 : Math.max(0, Math.min(1, Number(rgba[4])));
    return { hex: `#${channels.map(channel => Math.round(channel).toString(16).padStart(2,'0')).join('')}`, opacity: Math.round(alpha * 100) };
  }

  function normalizeStyleConfig(input = {}) {
    const config = { ...input };
    if (typeof config.strokeEnabled !== 'boolean') config.strokeEnabled = Number(config.strokeWidth || 0) > 0;
    const first = parseLegacyColor(config.bubbleColorStart, { hex:'#121420', opacity:70 });
    const second = parseLegacyColor(config.bubbleColorEnd, { hex:'#121420', opacity:70 });
    if (!['rounded','pill','card','glass'].includes(config.bubbleStyle)) config.bubbleStyle = 'rounded';
    if (!config.bubbleColor) config.bubbleColor = first.hex;
    if (!config.bubbleColorSecondary) config.bubbleColorSecondary = second.hex;
    if (typeof config.bubbleGradientEnabled !== 'boolean') config.bubbleGradientEnabled = Boolean(config.bubbleColorStart && config.bubbleColorEnd && config.bubbleColorStart !== config.bubbleColorEnd);
    const migratedOpacity = Math.round((first.opacity + second.opacity) / 2);
    const opacity = config.bubbleOpacity == null ? migratedOpacity : Number(config.bubbleOpacity);
    config.bubbleOpacity = Math.max(0, Math.min(100, Number.isFinite(opacity) ? opacity : 70));
    if (!config.fontSourceId) config.fontSourceId = '';
    return config;
  }

  function hexToRgba(hex, opacity) {
    const match = String(hex || '').match(/^#([0-9a-f]{6})$/i);
    const value = match ? match[1] : '000000';
    const channels = [0,2,4].map(index => parseInt(value.slice(index,index+2),16));
    const alpha = Math.max(0, Math.min(100, Number(opacity) || 0)) / 100;
    return `rgba(${channels.join(',')},${Number(alpha.toFixed(3))})`;
  }

  function bubblePresentation(raw = {}) {
    const config = normalizeStyleConfig(raw);
    if (!config.bubbleEnabled) return {background:'transparent',borderRadius:'0',padding:'0',border:'none',boxShadow:'none',backdropFilter:'none'};
    const primary = hexToRgba(config.bubbleColor, config.bubbleOpacity);
    const secondary = hexToRgba(config.bubbleColorSecondary, config.bubbleOpacity);
    const background = config.bubbleGradientEnabled ? `linear-gradient(135deg,${primary},${secondary})` : primary;
    const presets = {
      rounded:{borderRadius:'28px',padding:'18px 30px',border:'none',boxShadow:'none',backdropFilter:'none'},
      pill:{borderRadius:'999px',padding:'16px 38px',border:'none',boxShadow:'none',backdropFilter:'none'},
      card:{borderRadius:'12px',padding:'18px 24px',border:'1px solid rgba(255,255,255,.18)',boxShadow:'0 8px 24px rgba(0,0,0,.22)',backdropFilter:'none'},
      glass:{borderRadius:'22px',padding:'18px 30px',border:'1px solid rgba(255,255,255,.3)',boxShadow:'0 12px 36px rgba(0,0,0,.28)',backdropFilter:'blur(12px)'}
    };
    return { background, ...presets[config.bubbleStyle] };
  }

  function quoteFamily(value) {
    return `"${String(value || 'Microsoft YaHei').replace(/["\\]/g, '')}"`;
  }

  function fontCssFamily(config = {}, importedFonts = []) {
    const imported = importedFonts.find(font => font.id === config.fontSourceId);
    return `${quoteFamily(imported?.cssFamily || config.fontFamily)}, "Microsoft YaHei", sans-serif`;
  }

  const api = { normalizeStyleConfig, hexToRgba, bubblePresentation, fontCssFamily, isSupportedFontExtension };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.StyleUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
