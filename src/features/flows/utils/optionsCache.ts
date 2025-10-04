type CacheEntry = { value: unknown; ts: number };

class LruCache {
  private store = new Map<string, CacheEntry>();
  private maxEntries: number;
  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  get(key: string): CacheEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    // refresh LRU ordering
    this.store.delete(key);
    this.store.set(key, entry);
    return entry;
  }

  set(key: string, value: unknown): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, ts: Date.now() });
    if (this.store.size > this.maxEntries) {
      const first = this.store.keys().next().value as string | undefined;
      if (first) this.store.delete(first);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Namespaced caches (per flow)
const namespaceToCache: Record<string, LruCache> = {};

export function getNamespacedCache(namespace: string, max = 400): LruCache {
  if (!namespaceToCache[namespace]) namespaceToCache[namespace] = new LruCache(max);
  return namespaceToCache[namespace];
}

export function clearNamespace(namespace: string): void {
  if (namespaceToCache[namespace]) namespaceToCache[namespace].clear();
  delete namespaceToCache[namespace];
}

export function makeOptionsCacheKey(args: {
  pieceName: string;
  stepName: string;
  propName: string;
  connectionId: string;
  refreshers: Record<string, string | number | undefined>;
}): string {
  const { pieceName, stepName, propName, connectionId, refreshers } = args;
  const refs = Object.keys(refreshers)
    .sort()
    .map((k) => `${k}:${String(refreshers[k] ?? "")}`)
    .join("|");
  return `${pieceName}::${stepName}::${propName}::${connectionId}::${refs}`;
}

export function isFresh(ts: number, ttlMs: number): boolean {
  return Date.now() - ts < ttlMs;
}


