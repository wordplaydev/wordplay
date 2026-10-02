import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import watchLocales from './scripts/locales/watchLocales.ts';

const kit = sveltekit({
    preprocess: [vitePreprocess({ script: true })],
    adapter: adapter({
        pages: 'build',
        assets: 'build',
        fallback: '200.html',
    }),
    version: {
        // Poll _app/version.json every 15 minutes so long-open tabs notice a
        // deploy; SvelteKit also re-checks on navigation and when the window
        // regains focus. The `updated` state from $app/state flips to true when
        // the deployed version differs from the running one; see
        // UpdateNotification.svelte.
        pollInterval: 15 * 60 * 1000,
    },
    csp: {
        directives: {
            'script-src': [
                'self',
                // Allow compiling/instantiating WebAssembly without requiring
                // full 'unsafe-eval'. Needed by MediaPipe Tasks Vision (the
                // Hand() input stream's hand landmarker runs as WASM).
                'wasm-unsafe-eval',
                'https://fonts.googleapis.com',
                'https://fonts.gstatic.com',
                'https://www.googletagmanager.com',
                'https://apis.google.com',
                'https://*.googleapis.com',
                'https://*.firebaseapp.com',
                // reCAPTCHA Enterprise, which App Check's provider loads
                // (#1299). Two hosts: the loader at
                // www.google.com/recaptcha/enterprise.js and the payload it
                // pulls from www.gstatic.com. The fonts.gstatic.com entry above
                // does NOT cover the second — a source expression is
                // host-exact, and these are different hosts. Without both, App
                // Check fails to initialize and every enforced callable starts
                // answering `unauthenticated`, with nothing in the UI to say why.
                'https://www.google.com',
                'https://www.gstatic.com',
            ],
        },
    },
});

/**
 * Which named chunk a module belongs in, or null to leave it to rolldown's own
 * splitting by the route graph.
 * @param {string} id
 * @returns {string | null}
 */
function vendorChunk(id) {
    // No manual grouping for src/: a former `language` chunk (basis/nodes/parser)
    // measured ~27 KB gz LARGER eager than Rolldown's default per-route splitting
    // and, as one ~545 KB monolith, invalidated its whole cache on any
    // compiler/node/output edit. Letting Rolldown split by the route graph is
    // smaller and caches better across deploys.
    if (!id.includes('node_modules')) return null;
    // Kit 3's client entry must dynamically import its runtime as a chunk of its
    // own; grouping Kit into the vendor chunk merges the two and fails the build
    // with "Could not find the client runtime chunk".
    if (id.includes('node_modules/@sveltejs/kit/')) return null;
    // Keep these out of the vendor chunk so their dynamic import()s stay separate
    // chunks the browser fetches only when the feature is used, instead of on
    // every page load:
    //   temporal-polyfill — src/util/getTemporal.ts
    //   @dimforge/rapier2d-compat — src/output/physics/rapierLoader.ts (physics)
    //   @mediapipe        — src/input/Hand/HandLandmarker.ts (Hand())
    //   highlight.js      — highlightExternal.ts (tutorial code)
    //   fontkit (+ deps)  — Fonts.ts (Contour() glyph parsing)
    // Without these excludes, the blanket 'vendor' below overrides the dynamic
    // import and force-loads them eagerly on every route.
    if (
        [
            'temporal-polyfill',
            '@dimforge/rapier2d',
            '@mediapipe',
            'highlight.js',
            'node_modules/fontkit/',
            'node_modules/brotli/',
            'node_modules/restructure/',
            'node_modules/unicode-properties/',
            'node_modules/unicode-trie/',
            'node_modules/tiny-inflate/',
            'node_modules/dfa/',
        ].some((lazy) => id.includes(lazy))
    )
        return null;
    // Analytics, Auth, and Functions are all loaded lazily off the critical path
    // (see src/db/firebase.ts — initAnalytics / ensureAuth / getFunctionsInstance).
    // Exclude them from the firebase chunk below so their dynamic imports stay
    // separate lazy chunks instead of being pulled back in eagerly. Matches both
    // `@firebase/x` and the `firebase/x` entry wrappers; firestore + app are
    // deliberately NOT excluded, so they stay eager.
    if (
        id.includes('firebase/analytics') ||
        id.includes('firebase/auth') ||
        id.includes('firebase/functions')
    )
        return null;
    // Firestore + firebase/app are large and cache-stable; give them their own
    // chunk so an unrelated vendor change doesn't force a re-download of the whole
    // SDK (and vice versa).
    if (id.includes('@firebase') || id.includes('node_modules/firebase/'))
        return 'firebase';
    // Yjs (CRDT) is only used by the project editor; its own chunk keeps it
    // independently cacheable.
    if (id.includes('node_modules/yjs/')) return 'yjs';
    return 'vendor';
}

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [kit, watchLocales()],
    build: {
        // Kit 3 turns sourcemaps on by default. They cost readers nothing, but
        // roughly double what every deploy uploads to Hosting.
        sourcemap: false,
        chunkSizeWarningLimit: 1500,
        rolldownOptions: {
            output: {
                // Kit 3 sets codeSplitting to pin its manifest chunk, and rolldown
                // then silently ignores manualChunks. So the vendor grouping is a
                // codeSplitting group, and Kit's own group is restated beside it
                // in case this object replaces Kit's rather than merging with it.
                codeSplitting: {
                    groups: [
                        {
                            name: 'sveltekit-manifest',
                            test: '<sveltekit:generated>/app-manifest.js',
                        },
                        { name: vendorChunk, debugName: 'vendor' },
                    ],
                },
            },
        },
    },
    ssr: {
        // Kit 3 needs cookie 2 and nests it under its own node_modules, because
        // firebase-tools' express pins the hoisted copy at 0.7. Left external,
        // the prerender's bare `cookie` import resolves to that 0.7 and the build
        // dies; bundled, it resolves from Kit's own files.
        noExternal: ['cookie'],
    },
    server: {
        fs: {
            allow: ['./functions/src'],
        },
    },
};

export default config;
