const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rendererDir = path.join(__dirname, '..', 'src', 'renderer');

test('panel brand uses the application icon with a 40px rounded fallback badge', () => {
  const html = fs.readFileSync(path.join(rendererDir, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(rendererDir, 'styles.css'), 'utf8');

  assert.match(html, /<span class="brand-icon">U<img src="\.\.\/\.\.\/Unia-Icon\.png" alt="Unia 应用图标"><\/span>/);
  assert.match(css, /\.brand-icon\{[^}]*width:40px[^}]*height:40px[^}]*border-radius:13px[^}]*position:relative[^}]*overflow:hidden[^}]*\}/);
  assert.match(css, /\.brand-icon img\{[^}]*width:100%[^}]*height:100%[^}]*object-fit:cover[^}]*\}/);
});
