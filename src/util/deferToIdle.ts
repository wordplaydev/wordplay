/**
 * Run `fn` once the browser is idle, so non-critical background work (e.g.
 * opening secondary Firestore listeners on login) doesn't compete with the
 * critical path. Mirrors the requestIdleCallback-with-setTimeout-fallback
 * pattern in previewQueue.ts.
 *
 * Returns a cancel function. On the server (no `window`), `fn` runs
 * synchronously and the canceller is a no-op, preserving SSR/test behavior.
 *
 * A `timeout` is passed to requestIdleCallback so the work still runs on a
 * busy page that never reports idle.
 */
export default function deferToIdle(
    fn: () => void,
    timeout = 2000,
): () => void {
    if (typeof window === 'undefined') {
        fn();
        return () => {};
    }

    if (typeof window.requestIdleCallback === 'function') {
        const handle = window.requestIdleCallback(() => fn(), { timeout });
        return () => window.cancelIdleCallback(handle);
    }

    const handle = setTimeout(fn, 0);
    return () => clearTimeout(handle);
}
