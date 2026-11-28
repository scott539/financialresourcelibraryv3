import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// index.html sets the Tailwind color `slate` to a single value, so classes such as
// bg-slate-900 or text-slate-700 do not exist and render as nothing. The success view's
// "Back to Library" button was bg-slate-900 with white text: an empty white box.
test('the download modal uses no numbered slate classes, which this app does not define', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /slate:\s*'#[0-9a-f]{6}'/i, 'index.html still overrides slate with one color');
  const src = readFileSync(new URL('../components/DownloadModal.tsx', import.meta.url), 'utf8');
  const dead = src.match(/\b[\w:-]*slate-\d{2,3}\b/g) || [];
  assert.deepEqual(dead, [], `undefined classes: ${dead.join(', ')}`);
});

test('every Back to Library button has a visible background or border', () => {
  const src = readFileSync(new URL('../components/DownloadModal.tsx', import.meta.url), 'utf8');
  const buttons = [...src.matchAll(/<button[\s\S]*?>\s*Back to Library\s*<\/button>/g)].map(m => m[0]);
  assert.ok(buttons.length >= 2, 'both views have a Back to Library button');
  for (const b of buttons) assert.match(b, /bg-primary|border-line/, b);
});
