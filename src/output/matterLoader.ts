/**
 * matter-js (~25KB gz) is only needed by projects that use physics — Motion
 * input, or output with matter/collision. Most projects have none, so we keep it
 * out of the eager bundle and load it on demand via dynamic import (the vendor
 * manualChunks rule in vite.config.js excludes matter-js so this split survives).
 *
 * Physics.sync() is the single gate: it calls loadMatter() and skips the frame
 * until the module resolves. Every other matter-js call site (the Physics helpers,
 * Motion.updateBody) runs only after a body exists, i.e. only after sync loaded it,
 * so those use getMatter() and can assume it's present.
 */
// matter-js is a CommonJS `export = Matter` namespace, so its module type is
// the namespace itself (Engine, Bodies, Body, …). Under the bundler's interop
// the dynamic import may expose that either directly or wrapped in `.default`.
type MatterModule = typeof import('matter-js');

let matter: MatterModule | undefined;
let loading: Promise<void> | undefined;

/** Kick off loading (idempotent) and return the module if ready, else undefined. */
export function loadMatter(): MatterModule | undefined {
    if (matter !== undefined) return matter;
    if (loading === undefined)
        loading = import('matter-js').then((m) => {
            // Accept both interop shapes without a cast (see MatterModule note).
            const mod: MatterModule & { default?: MatterModule } = m;
            matter = mod.default ?? mod;
        });
    return undefined;
}

/** Whether matter-js has finished loading. Lets per-frame code (Physics.tick)
 *  check without triggering a load for projects that never use physics. */
export function matterLoaded(): boolean {
    return matter !== undefined;
}

/** The loaded matter-js. Only valid after loadMatter() has returned truthy. */
export function getMatter(): MatterModule {
    if (matter === undefined)
        throw new Error('matter-js used before it finished loading');
    return matter;
}
