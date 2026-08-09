const test=require('node:test');
const assert=require('node:assert/strict');
const { normalizeRegistryFontNames }=require('../src/font-registry.cjs');

test('normalizeRegistryFontNames preserves Chinese names and removes face annotations',()=>{
  const result=normalizeRegistryFontNames(['华文仿宋 (TrueType)','微软雅黑 Bold (TrueType)','Arial Italic (TrueType)','华文仿宋 (TrueType)']);
  assert.deepEqual(result,['华文仿宋','微软雅黑','Arial']);
});

test('normalizeRegistryFontNames drops PowerShell metadata and corrupted replacement names',()=>{
  const result=normalizeRegistryFontNames(['PSPath','PSParentPath','������ (TrueType)','Microsoft YaHei (TrueType)','']);
  assert.deepEqual(result,['Microsoft YaHei']);
});
