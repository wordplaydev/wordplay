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
                        // Leave temporal-polyfill out of the vendor chunk so its
                        // dynamic import (see src/util/getTemporal.ts) stays a
                        // separate chunk that Temporal-native browsers never fetch.
                        if (id.includes('temporal-polyfill')) return;
                        return 'vendor'; // Split vendor libraries
                    }
                    if (
                        id.includes('src/basis/') ||
                        id.includes('src/nodes/') ||
                        id.includes('src/outputs/') ||
                        id.includes('src/inputs/') ||
                        id.includes('src/parser/')
                    ) {
                        return 'language'; // Split components into their own chunk
                    }
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
