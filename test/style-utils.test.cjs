const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStyleConfig, hexToRgba, bubblePresentation, fontCssFamily, isSupportedFontExtension } = require('../src/renderer/style-utils.js');

test('normalizeStyleConfig migrates old stroke and gradient bubble values', () => {
  const result = normalizeStyleConfig({strokeWidth:2,bubbleEnabled:true,bubbleColorStart:'rgba(18,20,32,.2)',bubbleColorEnd:'rgba(18,20,32,.86)'});
  assert.equal(result.strokeEnabled,true);
  assert.equal(result.bubbleStyle,'rounded');
  assert.equal(result.bubbleGradientEnabled,true);
  assert.equal(result.bubbleColor,'#121420');
  assert.equal(result.bubbleColorSecondary,'#121420');
  assert.equal(result.bubbleOpacity,53);
});

test('normalizeStyleConfig preserves explicit new settings and clamps opacity', () => {
  const result = normalizeStyleConfig({strokeEnabled:false,strokeWidth:4,bubbleStyle:'glass',bubbleOpacity:150,bubbleGradientEnabled:false,bubbleColor:'#123456',bubbleColorSecondary:'#abcdef'});
  assert.equal(result.strokeEnabled,false);
  assert.equal(result.strokeWidth,4);
  assert.equal(result.bubbleStyle,'glass');
  assert.equal(result.bubbleOpacity,100);
  assert.equal(result.bubbleGradientEnabled,false);
});

test('hexToRgba applies background opacity without changing RGB', () => {
  assert.equal(hexToRgba('#ff0080',0),'rgba(255,0,128,0)');
  assert.equal(hexToRgba('#ff0080',50),'rgba(255,0,128,0.5)');
  assert.equal(hexToRgba('#ff0080',100),'rgba(255,0,128,1)');
});

test('bubblePresentation uses one color when gradient is disabled', () => {
  const style=bubblePresentation({bubbleEnabled:true,bubbleStyle:'rounded',bubbleOpacity:50,bubbleGradientEnabled:false,bubbleColor:'#102030',bubbleColorSecondary:'#ffffff'});
  assert.equal(style.background,'rgba(16,32,48,0.5)');
  assert.equal(style.borderRadius,'28px');
  assert.ok(!style.background.includes('255,255,255'));
});

test('bubblePresentation uses both colors when gradient is enabled', () => {
  const style=bubblePresentation({bubbleEnabled:true,bubbleStyle:'pill',bubbleOpacity:80,bubbleGradientEnabled:true,bubbleColor:'#000000',bubbleColorSecondary:'#ffffff'});
  assert.equal(style.background,'linear-gradient(135deg,rgba(0,0,0,0.8),rgba(255,255,255,0.8))');
  assert.equal(style.borderRadius,'999px');
});

test('bubblePresentation exposes distinct card and glass treatments', () => {
  const card=bubblePresentation({bubbleEnabled:true,bubbleStyle:'card',bubbleOpacity:70,bubbleGradientEnabled:false,bubbleColor:'#000000'});
  const glass=bubblePresentation({bubbleEnabled:true,bubbleStyle:'glass',bubbleOpacity:70,bubbleGradientEnabled:false,bubbleColor:'#000000'});
  assert.equal(card.borderRadius,'12px');
  assert.notEqual(card.border,'none');
  assert.equal(glass.backdropFilter,'blur(12px)');
  assert.notEqual(glass.boxShadow,'none');
});

test('bubblePresentation removes all bubble decoration when disabled', () => {
  assert.deepEqual(bubblePresentation({bubbleEnabled:false}),{background:'transparent',borderRadius:'0',padding:'0',border:'none',boxShadow:'none',backdropFilter:'none'});
});

test('fontCssFamily maps imported IDs and safely quotes system names', () => {
  const fonts=[{id:'abc',cssFamily:'UniaImported_abc'}];
  assert.equal(fontCssFamily({fontSourceId:'abc',fontFamily:'Imported'},fonts),'"UniaImported_abc", "Microsoft YaHei", sans-serif');
  assert.equal(fontCssFamily({fontSourceId:'',fontFamily:'Noto Sans CJK SC'},fonts),'"Noto Sans CJK SC", "Microsoft YaHei", sans-serif');
});

test('isSupportedFontExtension accepts exactly the four supported formats', () => {
  for(const file of ['a.ttf','a.OTF','a.woff','a.WOFF2']) assert.equal(isSupportedFontExtension(file),true);
  for(const file of ['a.txt','a.eot','a.ttf.exe','']) assert.equal(isSupportedFontExtension(file),false);
});
