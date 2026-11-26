import test from 'node:test';
import assert from 'node:assert/strict';
import { placeModal } from '../utils/modalPlacement.ts';

test('panel centers on the tapped control deep inside a tall embedded catalog', () => {
  // iPhone case: 8,544px iframe, visitor looking at 5,302-6,146, tapped at 5,724.
  const top = placeModal({ anchorY: 5724, visibleTop: 5302, visibleBottom: 6146, panelHeight: 730, docHeight: 8544 });
  assert.ok(top >= 5302 && top + 730 <= 6146, `panel ${top} must sit inside the visible range`);
});

test('a tap near the bottom of the screen keeps the whole panel on screen', () => {
  const top = placeModal({ anchorY: 6100, visibleTop: 5302, visibleBottom: 6146, panelHeight: 730, docHeight: 8544 });
  assert.equal(top, 6146 - 730 - 16);
});

test('a tap near the top of the screen keeps the panel below the top edge', () => {
  const top = placeModal({ anchorY: 5310, visibleTop: 5302, visibleBottom: 6146, panelHeight: 730, docHeight: 8544 });
  assert.equal(top, 5302 + 16);
});

test('without a visible range the tap position alone places the panel', () => {
  assert.equal(placeModal({ anchorY: 4000, visibleTop: null, visibleBottom: null, panelHeight: 600, docHeight: 9000 }), 3700);
});

test('the panel never leaves the document', () => {
  assert.equal(placeModal({ anchorY: 50, visibleTop: null, visibleBottom: null, panelHeight: 600, docHeight: 9000 }), 16);
  assert.equal(placeModal({ anchorY: 8990, visibleTop: null, visibleBottom: null, panelHeight: 600, docHeight: 9000 }), 9000 - 600 - 16);
});

test('a panel taller than the visible range starts at its top', () => {
  assert.equal(placeModal({ anchorY: 700, visibleTop: 300, visibleBottom: 900, panelHeight: 800, docHeight: 5000 }), 316);
});
