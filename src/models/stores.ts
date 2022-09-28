import { get, writable, type Writable } from 'svelte/store';
import { examples, makeProject } from '../examples/examples';
import type Project from './Project';

// A store that contains the project currently being viewed.
export const project: Writable<Project> = writable<Project>(makeProject(examples[0]));

export function updateProject(newProject: Project) {

    get(project)?.cleanup();
    project.set(newProject);

}