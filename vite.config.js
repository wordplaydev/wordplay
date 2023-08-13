import { sveltekit } from '@sveltejs/kit/vite';
import eslint from 'vite-plugin-eslint';
import path from 'path';

/**
 * Make a little plugin that checks for locale file changes and fires an event.
 * The event is handled in Database.ts, where locales are cached.
 */
function LocaleHotReload() {
    return {
        name: 'locale-hot-reload',
        handleHotUpdate({ file, server }) {
            if (file.includes('locales') && file.endsWith('.json')) {
                console.log(`${file} changed, sending update event.`);
                server.ws.send({
                    type: 'custom',
                    event: 'locales-update',
                });
            }
        },
    };
}

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [sveltekit(), LocaleHotReload(), eslint()],
    resolve: {
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
            '@models': path.resolve('./src/models'),
            '@db': path.resolve('./src/db'),
        },
    },
};

export default config;
