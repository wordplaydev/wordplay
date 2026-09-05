import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [vitePreprocess({ script: true })],
    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: '200.html',
        }),
        version: {
            // Poll _app/version.json every 15 minutes so long-open tabs
            // notice a deploy. SvelteKit also re-checks on every client-side
            // navigation. The `updated` store from $app/state flips to true
            // when the deployed version differs from the running one; see
            // UpdateNotification.svelte.
            pollInterval: 15 * 60 * 1000,
        },
        alias: {
            '@components': path.resolve('./src/components'),
            '@nodes': path.resolve('./src/nodes'),
            '@runtime': path.resolve('./src/runtime'),
            '@values': path.resolve('./src/values'),
            '@conflicts': path.resolve('./src/conflicts'),
            '@locale': path.resolve('./src/locale'),
            '@concepts': path.resolve('./src/concepts'),
            '@parser': path.resolve('./src/parser'),
            '@input': path.resolve('./src/input'),
            '@output': path.resolve('./src/output'),
            '@basis': path.resolve('./src/basis'),
            '@edit': path.resolve('./src/edit'),
            '@db': path.resolve('./src/db'),
            '@unicode': path.resolve('./src/unicode'),
            '@util': path.resolve('./src/util'),
        },
        csp: {
            directives: {
                'script-src': [
                    'self',
                    // Allow compiling/instantiating WebAssembly without
                    // requiring full 'unsafe-eval'. Needed by MediaPipe
                    // Tasks Vision (the Hand() input stream's hand
                    // landmarker runs as WASM).
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
                    // pulls from www.gstatic.com. The fonts.gstatic.com entry
                    // above does NOT cover the second — a source expression is
                    // host-exact, and these are different hosts. Without both,
                    // App Check fails to initialize and every enforced callable
                    // starts answering `unauthenticated`, with nothing in the
                    // UI to say why.
                    'https://www.google.com',
                    'https://www.gstatic.com',
                ],
            },
        },
    },
};

export default config;
