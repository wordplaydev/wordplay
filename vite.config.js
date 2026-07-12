import { sveltekit } from '@sveltejs/kit/vite';

/**
 * Make a little plugin that checks for locale file changes and fires an event.
 * The event is handled in database.ts, where locales are cached.
 */
function LocaleHotReload() {
    return {
        name: 'locale-hot-reload',
        // @ts-expect-error This is a Vite API, and eslint is warning on missing types, but this is not a TypeScript file.
        handleHotUpdate({ file, server }) {
            if (file.includes('locales') && file.endsWith('.json')) {
                console.log(`${file} changed, sending update event.`);
                server.ws.send({ type: 'custom', event: 'locales-update' });
            }
        },
    };
}

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [sveltekit(), LocaleHotReload()],
    build: {
        chunkSizeWarningLimit: 1500,
        rolldownOptions: {
            output: {
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        // Keep these out of the vendor chunk so their dynamic
                        // import()s stay separate chunks the browser fetches only
                        // when the feature is used, instead of on every page load:
                        //   temporal-polyfill — src/util/getTemporal.ts
                        //   @dimforge/rapier2d-compat — src/output/rapierLoader.ts (physics)
                        //   @mediapipe        — src/input/HandLandmarker.ts (Hand())
                        //   highlight.js      — highlightExternal.ts (tutorial code)
                        //   fontkit (+ deps)  — Fonts.ts (Contour() glyph parsing)
                        // Without these excludes, the blanket `return 'vendor'`
                        // below overrides the dynamic import and force-loads them
                        // eagerly on every route.
                        if (id.includes('temporal-polyfill')) return;
                        if (id.includes('@dimforge/rapier2d')) return;
                        if (id.includes('@mediapipe')) return;
                        if (id.includes('highlight.js')) return;
                        if (
                            id.includes('node_modules/fontkit/') ||
                            id.includes('node_modules/brotli/') ||
                            id.includes('node_modules/restructure/') ||
                            id.includes('node_modules/unicode-properties/') ||
                            id.includes('node_modules/unicode-trie/') ||
                            id.includes('node_modules/tiny-inflate/') ||
                            id.includes('node_modules/dfa/')
                        )
                            return;
                        // Analytics, Auth, and Functions are all loaded lazily
                        // off the critical path (see src/db/firebase.ts —
                        // initAnalytics / ensureAuth / getFunctionsInstance).
                        // Exclude them from the firebase chunk below so their
                        // dynamic imports stay separate lazy chunks instead of
                        // being pulled back in eagerly. Matches both `@firebase/x`
                        // and the `firebase/x` entry wrappers; firestore + app
                        // are deliberately NOT excluded, so they stay eager.
                        if (
                            id.includes('firebase/analytics') ||
                            id.includes('firebase/auth') ||
                            id.includes('firebase/functions')
                        )
                            return;
                        // Firestore + firebase/app are large and cache-stable;
                        // give them their own chunk so an unrelated vendor change
                        // doesn't force a re-download of the whole SDK (and vice
                        // versa). Auth/functions/analytics are excluded above.
                        if (
                            id.includes('@firebase') ||
                            id.includes('node_modules/firebase/')
                        )
                            return 'firebase';
                        // Yjs (CRDT) is only used by the project editor; its own
                        // chunk keeps it independently cacheable.
                        if (id.includes('node_modules/yjs/')) return 'yjs';
                        return 'vendor'; // Split remaining vendor libraries
                    }
                    // No manual grouping for src/: a former `language` chunk
                    // (basis/nodes/parser) measured ~27 KB gz LARGER eager than
                    // Rolldown's default per-route splitting and, as one ~545 KB
                    // monolith, invalidated its whole cache on any compiler/node/
                    // output edit. Letting Rolldown split by the route graph is
                    // smaller and caches better across deploys. (Its
                    // `src/outputs/`/`src/inputs/` patterns were also dead — the
                    // real dirs are singular src/output, src/input.)
                },
            },
        },
    },
    server: {
        fs: {
            allow: ['./functions/src'],
        },
    },
};

export default config;
