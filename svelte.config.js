import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://github.com/sveltejs/svelte-preprocess
    // for more information about preprocessors
    preprocess: preprocess(),

    kit: {
        adapter: adapter({
            pages: 'build',
            assets: 'build',
            fallback: 'index.html',
        }),
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
        },
        csp: {
            directives: {
                'script-src': [
                    'self',
                    'https://fonts.googleapis.com',
                    'https://fonts.gstatic.com',
                    'https://www.googletagmanager.com',
                    'https://apis.google.com',
                    'https://*.googleapis.com',
                    'https://*.firebaseapp.com',
                ],
            },
        },
    },
};

export default config;
