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

/**
 * The download progress of a model, as a fraction in [0, 1], or `undefined`
 * when the total size is unknown (no `Content-Length`) so the UI shows an
 * indeterminate state instead of a bar stuck at 0.
 */
export type LoadProgress = number | undefined;

/**
 * Cache of fully-downloaded model bytes, keyed by URL. The periodic recreate
 * (see maybeRecreate) rebuilds the MediaPipe instance every 30s to release its
 * WASM heap; without this cache each rebuild would re-download the multi-MB
 * model. We fetch the bytes once, report progress, and hand the same buffer to
 * every subsequent create.
 */
const modelBufferCache = new Map<string, Uint8Array>();

/**
 * Fetch a model file, reporting download progress against `Content-Length`, and
 * cache the bytes so later recreates reuse them. We do this ourselves (rather
 * than letting MediaPipe fetch from a URL) purely to surface real byte-level
 * progress — MediaPipe's own loader reports none. The HTTP cache still applies,
 * so a previously-downloaded model resolves from disk and jumps to 100%.
 */
export async function fetchModel(
    url: string,
    onProgress: (progress: LoadProgress) => void,
): Promise<Uint8Array> {
    const cached = modelBufferCache.get(url);
    if (cached) {
        onProgress(1);
        return cached;
    }

    const response = await fetch(url);
    if (!response.ok || response.body === null)
        throw new Error(`Failed to fetch model ${url}: ${response.status}`);

    // Content-Length is CORS-safelisted, so it's readable cross-origin; when a
    // CDN omits it we report indeterminate progress rather than a false 0%.
    const totalHeader = response.headers.get('Content-Length');
    const total = totalHeader ? Number(totalHeader) : undefined;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    onProgress(total ? 0 : undefined);
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onProgress(total ? received / total : undefined);
    }

    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    onProgress(1);
    modelBufferCache.set(url, bytes);
    return bytes;
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
    /** Subscribe to loading-state changes; returns an unsubscribe function. The
     *  observer receives the current progress (or `undefined`) while loading. */
    observeLoading(
        observer: (loading: boolean, progress: LoadProgress) => void,
    ): () => void;
};

/** A no-op progress sink for recreates, whose bytes come from the cache. */
const ignoreProgress = () => {};

/**
 * Build the shared lifecycle around a landmarker `create(onProgress)` closure.
 * `T` must expose `close()` so the periodic recycle can release the old
 * instance's WASM heap. The closure calls `onProgress` while it downloads (via
 * {@link fetchModel}); the first load forwards that to observers, and the
 * periodic recreate runs silently since its bytes come from the cache.
 */
export default function createLandmarkerRuntime<T extends { close(): void }>(
    create: (onProgress: (progress: LoadProgress) => void) => Promise<T>,
): LandmarkerRuntime<T> {
    let landmarker: T | undefined;
    let loadingPromise: Promise<T> | undefined;
    let createdAt = 0;
    let recreatePromise: Promise<T> | undefined;

    const observers: ((loading: boolean, progress: LoadProgress) => void)[] = [];
    const notifyLoading = (loading: boolean, progress: LoadProgress) => {
        for (const o of observers) o(loading, progress);
    };

    async function get(): Promise<T> {
        if (landmarker) return landmarker;
        if (loadingPromise) return loadingPromise;

        notifyLoading(true, undefined);
        loadingPromise = (async () => {
            const result = await create((progress) =>
                notifyLoading(true, progress),
            );
            landmarker = result;
            createdAt = performance.now();
            notifyLoading(false, undefined);
            return result;
        })();

        try {
            return await loadingPromise;
        } catch (e) {
            notifyLoading(false, undefined);
            loadingPromise = undefined;
            throw e;
        }
    }

    function maybeRecreate(): void {
        if (!landmarker || recreatePromise) return;
        if (performance.now() - createdAt < RECREATE_INTERVAL_MS) return;

        recreatePromise = (async () => {
            try {
                const fresh = await create(ignoreProgress);
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
