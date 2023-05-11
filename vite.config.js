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
            '@locale': path.resolve('./src/locale'),
            '@concepts': path.resolve('./src/concepts'),
            '@parser': path.resolve('./src/parser'),
            '@input': path.resolve('./src/input'),
            '@output': path.resolve('./src/output'),
            '@native': path.resolve('./src/native'),
            '@transforms': path.resolve('./src/transforms'),
            '@models': path.resolve('./src/models'),
            '@db': path.resolve('./src/db'),
        },
    },
};

export default config;
