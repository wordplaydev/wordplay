export const prerender = true;

import { examples, makeProject } from '../examples/examples';

/** @type {import('./$types').LayoutLoad} */
export async function load() {
    return {
        projects: examples.map((example) => makeProject(example)),
    };
}
