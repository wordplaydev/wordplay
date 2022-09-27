import { get, writable, type Writable } from 'svelte/store';
import { examples } from '../examples/examples';
import Project from './Project';
import Source from './Source';

// A store that contains the project currently being viewed.
export const project: Writable<Project> = writable<Project>(new Project("WhatWord", new Source("start", examples.WhatWord, "play"), []));

export function updateProject(newProject: Project) {

    get(project)?.cleanup();
    project.set(newProject);

}