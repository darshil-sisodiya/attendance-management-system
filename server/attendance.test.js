import test from 'node:test';
import assert from 'node:assert/strict';
import { percent, classesNeeded, classesCanSkip } from './attendance.js';

test('percent', () => {
  assert.equal(percent(3, 4), 75);
  assert.equal(percent(2, 3), 66.7);
  assert.equal(percent(0, 0), null);
});

test('classesNeeded reaches exactly 75%', () => {
  assert.equal(classesNeeded(15, 20), 0); // already 75%
  assert.equal(classesNeeded(12, 20), 12); // (12+12)/(20+12) = 75%
  assert.equal(classesNeeded(13, 20), 8); // 21/28 = 75%
  assert.equal(classesNeeded(0, 1), 3);
});

test('classesCanSkip stays at or above 75%', () => {
  assert.equal(classesCanSkip(15, 20), 0);
  assert.equal(classesCanSkip(20, 20), 6); // 20/26 = 76.9%, 20/27 = 74.1%
  assert.equal(classesCanSkip(10, 20), 0);
});
