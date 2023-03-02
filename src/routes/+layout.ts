export const prerender = true;

import Projects from '../components/project/Projects';
import { examples, makeProject } from '../examples/examples';

/** @type {import('./$types').LayoutLoad} */
export async function load() {
    const projects = new Projects([]);
    await projects.load();
    projects.addUnique(examples.map((example) => makeProject(example)));

    return {
        projects,
    };
}
