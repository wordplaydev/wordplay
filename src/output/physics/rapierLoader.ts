/**
 * Rapier (@dimforge/rapier2d-compat) is a WASM physics engine only needed by
 * projects that use physics — Motion input, or output with matter/collision.
 * Most projects have none, so we keep it out of the eager bundle and load it on
 * demand via dynamic import (the vendor manualChunks rule in vite.config.js
 * excludes @dimforge so this split survives).
 *
 * The -compat build base64-embeds its .wasm into the JS, so there's no separate
 * asset for the bundler to resolve; the tradeoff is a larger module, paid only
 * by physics projects and only once.
 *
 * Rapier requires an async `init()` before any API use. We MUST NOT do that at
 * module top-level: a module-level await anywhere in the app graph crashes
 * WebKit hydration. Instead init() runs inside loadRapier(), and Physics.sync()
 * is the single gate — it calls loadRapier() and skips the frame until the
 * module resolves. Every other Rapier call site (the Physics helpers,
 * Motion.updateBody) runs only after a body exists, i.e. only after sync loaded
 * it, so those use getRapier() and can assume it's present.
 */
type RapierModule = typeof import('@dimforge/rapier2d-compat');

let rapier: RapierModule | undefined;
let loading: Promise<void> | undefined;

/** One-shot callbacks to fire once the async load finishes. A pure-physics
 *  program never re-evaluates on its own until bodies exist (and bodies only
 *  get created once Rapier is loaded), so sync()'s bail-out registers here to
 *  break that deadlock. */
let loadListeners: Array<() => void> = [];

/** Kick off loading + WASM init (idempotent) and return the module if ready, else undefined. */
export function loadRapier(): RapierModule | undefined {
    if (rapier !== undefined) return rapier;
    if (loading === undefined)
        loading = import('@dimforge/rapier2d-compat').then((m) => {
            // The -compat build's own init() passes its embedded WASM bytes
            // positionally to the wasm-bindgen initializer, which logs a
            // "deprecated parameters" warning we can't avoid from the outside
            // (still present in 0.19.3). Filter exactly that message for the
            // duration of init(); remove this when upstream fixes its call.
            const warn = console.warn;
            console.warn = (...data: unknown[]) => {
                if (
                    typeof data[0] === 'string' &&
                    data[0].includes(
                        'deprecated parameters for the initialization function',
                    )
                )
                    return;
                warn(...data);
            };
            // init() compiles the embedded WASM; only after it resolves is the
            // API usable, so we set `rapier` after it.
            return m
                .init()
                .finally(() => {
                    console.warn = warn;
                })
                .then(() => {
                    rapier = m;
                    // Notify anyone who bailed while we were loading, then clear
                    // (the listeners are one-shot).
                    const listeners = loadListeners;
                    loadListeners = [];
                    for (const listener of listeners) listener();
                });
        });
    return undefined;
}

/** Register a one-shot callback fired when Rapier finishes loading. Callers
 *  register only in the not-yet-loaded branch (right after loadRapier() returned
 *  undefined, with no intervening await), so `rapier` is still undefined here;
 *  the guard just makes the contract explicit. */
export function onRapierLoaded(callback: () => void): void {
    if (rapier !== undefined) callback();
    else loadListeners.push(callback);
}

/** Whether Rapier has finished loading + initializing. Lets per-frame code
 *  (Physics.tick) check without triggering a load for projects that never use physics. */
export function rapierLoaded(): boolean {
    return rapier !== undefined;
}

/** The loaded Rapier module. Only valid after loadRapier() has returned truthy. */
export function getRapier(): RapierModule {
    if (rapier === undefined)
        throw new Error('Rapier used before it finished loading');
    return rapier;
}
