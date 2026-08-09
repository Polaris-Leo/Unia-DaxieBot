function normalizeRegistryFontNames(values) {
  const names=new Set();
  for(const raw of Array.isArray(values)?values:[]) {
    let name=String(raw||'').trim();
    if(!name||name.startsWith('PS')||name.includes('\uFFFD')) continue;
    name=name.replace(/\s*\((?:TrueType|OpenType|All res)\)\s*$/i,'').replace(/\s+(?:Regular|Bold|Italic|Oblique|Light|Medium|Semibold|Semi Bold|Black)(?:\s+Italic)?$/i,'').trim();
    if(name) names.add(name);
  }
  return [...names].sort((a,b)=>a.localeCompare(b,'zh-CN'));
}
module.exports={normalizeRegistryFontNames};
