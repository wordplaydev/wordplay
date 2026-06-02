/**
 * Whether this runtime can use IndexedDB, the backing store for the local-first
 * cache. The single source of truth for the check that every database facade
 * needs.
 *
 * It's a function (not a module-level constant) so it runs at call time on the
 * client and never freezes a build/SSR value: during prerender there is no
 * `window`, so it returns false and callers skip all local-cache work without
 * touching a browser-only API.
 */
export default function supportsIndexedDB(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
}
