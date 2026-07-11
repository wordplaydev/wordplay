/**
 * Generic lifecycle for a lazily-loaded MediaPipe Tasks Vision landmarker
 * (hand, face, …). Kept free of Svelte runes so that non-browser tooling (like
 * the locale verifier, which runs under tsx) can import the surrounding stream
 * definitions without tripping over compiler-only syntax. Each concrete
 * landmarker supplies only its own `create()` closure (model URL + options);
 * everything else — lazy load, the periodic WASM-heap recycle, and the loading
 * observer registry — is shared here.
 */

/**
 * How long a single MediaPipe landmarker instance is allowed to live before it
 * gets torn down and re-created. `WebAssembly.Memory` only ever grows —
 * MediaPipe's per-frame tensor allocations accumulate in the WASM heap and
 * never shrink, which on iOS Safari (with its ~1GB per-process memory ceiling)
 * causes the tab to be killed within ~10s of active tracking. Periodically
 * closing the landmarker fully releases its WASM heap back to the OS. 30s is a
 * tradeoff: short enough that growth stays bounded, long enough that the ~300ms
 * creation hiccup is rare. Detection never stalls — the old landmarker keeps
 * serving frames until the new one is ready, then the swap is atomic.
 */
const RECREATE_INTERVAL_MS = 30_000;

/**
 * True on Safari desktop and every browser on iOS (all WebKit). UA sniffing is
 * appropriate here because the underlying issue — WebGL texture GC lagging
 * until the OS kills the tab — is browser-engine-specific and has no
 * feature-detect equivalent that surfaces in less than a few minutes.
 * `navigator.vendor` is set to an Apple string by every WebKit-based browser,
 * which catches "Chrome on iOS" too (also WebKit underneath).
 */
export function isWebKit(): boolean {
    if (typeof navigator === 'undefined') return true;
    // JSDOM and some Node test runtimes leave `vendor` undefined; treat that as
    // "not Apple" so test environments don't trigger Safari-only code paths.
    return navigator.vendor?.includes('Apple') ?? false;
}

let lastDetectTimestamp = 0;

/**
 * Strictly-monotonic timestamp for MediaPipe's `detectForVideo`, shared across
 * every landmarker on the page. A landmarker survives across Wordplay program
 * re-runs, but `tick` time resets per run — sending a smaller timestamp than
 * one previously seen makes MediaPipe error out. `performance.now()` is
 * monotonic for the whole page session; the `+1` floor protects against
 * multiple streams calling within the same fractional millisecond.
 */
export function nextDetectTimestamp(): number {
    const now = performance.now();
    lastDetectTimestamp = Math.max(now, lastDetectTimestamp + 1);
    return lastDetectTimestamp;
}

/** The lifecycle surface a concrete landmarker module re-exports for its stream. */
export type LandmarkerRuntime<T> = {
    /** Lazy-load (or return the loaded) landmarker, deduping concurrent loads. */
    get(): Promise<T>;
    /** Sync accessor for the currently-active landmarker, or undefined while loading/swapping. */
    current(): T | undefined;
    /** Kick off a background recreate if the recycle interval has elapsed. */
    maybeRecreate(): void;
    /** True once the landmarker has loaded (subsequent streams skip the spinner). */
    isReady(): boolean;
    /** Subscribe to loading-state changes; returns an unsubscribe function. */
    observeLoading(observer: (loading: boolean) => void): () => void;
};

/**
 * Build the shared lifecycle around a landmarker `create()` closure. `T` must
 * expose `close()` so the periodic recycle can release the old instance's WASM
 * heap.
 */
export default function createLandmarkerRuntime<T extends { close(): void }>(
    create: () => Promise<T>,
): LandmarkerRuntime<T> {
    let landmarker: T | undefined;
    let loadingPromise: Promise<T> | undefined;
    let createdAt = 0;
    let recreatePromise: Promise<T> | undefined;

    const observers: ((loading: boolean) => void)[] = [];
    const notifyLoading = (loading: boolean) => {
        for (const o of observers) o(loading);
    };

    async function get(): Promise<T> {
        if (landmarker) return landmarker;
        if (loadingPromise) return loadingPromise;

        notifyLoading(true);
        loadingPromise = (async () => {
            const result = await create();
            landmarker = result;
            createdAt = performance.now();
            notifyLoading(false);
            return result;
        })();

        try {
            return await loadingPromise;
        } catch (e) {
            notifyLoading(false);
            loadingPromise = undefined;
            throw e;
        }
    }

    function maybeRecreate(): void {
        if (!landmarker || recreatePromise) return;
        if (performance.now() - createdAt < RECREATE_INTERVAL_MS) return;

        recreatePromise = (async () => {
            try {
                const fresh = await create();
                // Atomic swap: until this point all detect() calls used the old
                // instance; after this point new calls use the fresh one. JS
                // single-threading guarantees no detect() is mid-call here.
                const old = landmarker;
                landmarker = fresh;
                createdAt = performance.now();
                // Releasing the old one frees its WebAssembly.Memory back to the
                // OS — the whole point of this dance.
                if (old) old.close();
                return fresh;
            } finally {
                recreatePromise = undefined;
            }
        })();
    }

    return {
        get,
        current: () => landmarker,
        maybeRecreate,
        isReady: () => landmarker !== undefined,
        observeLoading(observer) {
            observers.push(observer);
            return () => {
                const i = observers.indexOf(observer);
                if (i >= 0) observers.splice(i, 1);
            };
        },
    };
}
