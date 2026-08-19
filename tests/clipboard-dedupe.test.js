import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createContentHash,
  createRecentContentCache,
  isDuplicateContent,
} from '../desktop/clipboard-dedupe.mjs';

test('content hash uses the complete clipboard value', () => {
  const sharedPrefix = 'x'.repeat(256);
  assert.notEqual(
    createContentHash(`${sharedPrefix}first`),
    createContentHash(`${sharedPrefix}second`),
  );
});

test('duplicate cache suppresses content only within its TTL', () => {
  const cache = createRecentContentCache();
  const hash = createContentHash('same content');

  assert.equal(isDuplicateContent(cache, 'text', hash, 1_000, 60_000), false);
  assert.equal(isDuplicateContent(cache, 'text', hash, 2_000, 60_000), true);
  assert.equal(isDuplicateContent(cache, 'text', hash, 62_000, 60_000), false);
});

test('text and image duplicate caches are independent', () => {
  const cache = createRecentContentCache();
  const hash = createContentHash('same bytes');

  assert.equal(isDuplicateContent(cache, 'text', hash, 1_000), false);
  assert.equal(isDuplicateContent(cache, 'image', hash, 1_000), false);
});
