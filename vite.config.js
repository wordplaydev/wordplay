import { sveltekit } from '@sveltejs/kit/vite';
import path from 'path';

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [sveltekit()],
    resolve: {
        alias: {
            '@components': path.resolve('./src/components'),
            '@nodes': path.resolve('./src/nodes'),
            '@runtime': path.resolve('./src/runtime'),
            '@conflicts': path.resolve('./src/conflicts'),
            '@translation': path.resolve('./src/translation'),
            '@concepts': path.resolve('./src/concepts'),
        },
    },
};

export default config;
