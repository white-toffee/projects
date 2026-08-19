import { createHash } from 'node:crypto';

export const CLIPBOARD_DEDUPE_MS = 60_000;

export function createContentHash(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function createRecentContentCache() {
  return { text: new Map(), image: new Map() };
}

export function isDuplicateContent(
  cache,
  kind,
  hash,
  now = Date.now(),
  ttlMs = CLIPBOARD_DEDUPE_MS,
) {
  const bucket = cache[kind];
  for (const [cachedHash, timestamp] of bucket) {
    if (now - timestamp > ttlMs) bucket.delete(cachedHash);
  }
  if (bucket.has(hash)) return true;
  bucket.set(hash, now);
  return false;
}
