import type { HandLandmarker } from '@mediapipe/tasks-vision';

/**
 * Plain-TypeScript runtime for lazy-loading MediaPipe's hand landmarker.
 * Kept free of Svelte runes so that non-browser tooling (like the locale
 * verifier, which runs under tsx) can import the surrounding stream
 * definitions without tripping over compiler-only syntax. The reactive
 * loading state lives next door in HandLandmarkerLoader.svelte.ts and
 * subscribes via observeLoading() below.
 */

let landmarker: HandLandmarker | undefined;
let loadingPromise: Promise<HandLandmarker> | undefined;
let landmarkerCreatedAt = 0;
let recreatePromise: Promise<HandLandmarker> | undefined;

/**
 * How long a single MediaPipe HandLandmarker instance is allowed to live
 * before it gets torn down and re-created. `WebAssembly.Memory` only ever
 * grows — MediaPipe's per-frame tensor allocations accumulate in the WASM
 * heap and never shrink, which on iOS Safari (with its ~1GB per-process
 * memory ceiling) causes the tab to be killed within ~10s of active hand
 * tracking. Periodically closing the landmarker fully releases its WASM
 * heap back to the OS. 30s is a tradeoff: short enough that growth stays
 * bounded, long enough that the ~300ms creation hiccup is rare. Detection
 * never stalls — the old landmarker keeps serving frames until the new
 * one is ready, then the swap is atomic.
 */
const RECREATE_INTERVAL_MS = 30_000;

/**
 * True on Safari desktop and every browser on iOS (all WebKit). UA sniffing
 * is appropriate here because the underlying issue — WebGL texture GC
 * lagging until the OS kills the tab — is browser-engine-specific and has
 * no feature-detect equivalent that surfaces in less than a few minutes.
 * `navigator.vendor` is set to an Apple string by every WebKit-based
 * browser, which catches "Chrome on iOS" too (also WebKit underneath).
 */
export function isWebKit(): boolean {
    if (typeof navigator === 'undefined') return true;
    // JSDOM and some Node test runtimes leave `vendor` undefined; treat
    // that as "not Apple" so test environments don't trigger Safari-only
    // code paths.
    return navigator.vendor?.includes('Apple') ?? false;
}

type LoadingObserver = (loading: boolean) => void;
const observers: LoadingObserver[] = [];

/**
 * Subscribe to loading-state changes. Returns an unsubscribe function. The
 * loader uses this so that the Svelte $state container in
 * HandLandmarkerLoader.svelte.ts can stay in sync without this file
 * depending on Svelte.
 */
export function observeLoading(observer: LoadingObserver): () => void {
    observers.push(observer);
    return () => {
        const i = observers.indexOf(observer);
        if (i >= 0) observers.splice(i, 1);
    };
}

function notifyLoading(loading: boolean) {
    for (const o of observers) o(loading);
}

/**
 * Construct a fresh HandLandmarker. Shared between initial load and
 * periodic recreate. WebKit (Safari desktop, all iOS browsers) gets the
 * CPU delegate because its WebGL texture GC lags until the OS kills the
 * tab; Chromium/Gecko keep the GPU speedup.
 */
async function createLandmarker(): Promise<HandLandmarker> {
    const { HandLandmarker, FilesetResolver } = await import(
        '@mediapipe/tasks-vision'
    );
    const fileset = await FilesetResolver.forVisionTasks('/wasm');
    return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
            modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: isWebKit() ? 'CPU' : 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
    });
}

/**
 * Get the shared HandLandmarker instance, lazy-loading MediaPipe Tasks
 * Vision (~3–4MB gzipped WASM + ~5MB model) on first call. Subsequent
 * calls return the existing instance.
 */
export async function getHandLandmarker(): Promise<HandLandmarker> {
    if (landmarker) return landmarker;
    if (loadingPromise) return loadingPromise;

    notifyLoading(true);
    loadingPromise = (async () => {
        const result = await createLandmarker();
        landmarker = result;
        landmarkerCreatedAt = performance.now();
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

/**
 * Synchronous accessor — returns the currently-active landmarker (or
 * undefined if still loading or being swapped). Hand.tick() uses this so
 * its main per-frame path stays sync. Always returns the *latest*
 * landmarker; an in-flight recreate keeps the old one usable until the
 * new one is ready, then atomically swaps.
 */
export function currentHandLandmarker(): HandLandmarker | undefined {
    return landmarker;
}

/**
 * Kick off a background recreate if enough time has passed. Cheap to call
 * every tick — only does work when the interval has elapsed and no other
 * recreate is already in flight. The actual close+swap happens after the
 * new landmarker is ready, so detection never stalls.
 */
export function maybeRecreateHandLandmarker(): void {
    if (!landmarker || recreatePromise) return;
    if (performance.now() - landmarkerCreatedAt < RECREATE_INTERVAL_MS) return;

    recreatePromise = (async () => {
        try {
            const fresh = await createLandmarker();
            // Atomic swap: until this point all detect() calls used the
            // old instance; after this point new calls use the fresh one.
            // JS single-threading guarantees no detect() is mid-call here.
            const old = landmarker;
            landmarker = fresh;
            landmarkerCreatedAt = performance.now();
            // Releasing the old one frees its WebAssembly.Memory back to
            // the OS — the whole point of this dance.
            if (old) old.close();
            return fresh;
        } finally {
            recreatePromise = undefined;
        }
    })();
}

/** True if the landmarker has already loaded (subsequent Hand() streams skip the spinner). */
export function isHandLandmarkerReady(): boolean {
    return landmarker !== undefined;
}

let lastDetectTimestamp = 0;

/**
 * Strictly-monotonic timestamp for MediaPipe's `detectForVideo`. The
 * HandLandmarker survives across Wordplay program re-runs, but `tick` time
 * resets per run — sending a smaller timestamp than one previously seen
 * makes MediaPipe error out. `performance.now()` is monotonic for the
 * whole page session; the `+1` floor protects against multiple Hand
 * instances calling within the same fractional millisecond.
 */
export function nextDetectTimestamp(): number {
    const now = performance.now();
    lastDetectTimestamp = Math.max(now, lastDetectTimestamp + 1);
    return lastDetectTimestamp;
}
