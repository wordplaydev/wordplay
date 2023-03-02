import Project from '@models/Project';
import { Mode } from '@runtime/Evaluator';
import type Node from '@nodes/Node';
import type { ProjectsContext } from './Contexts';
import { writable } from 'svelte/store';

export default class Projects {
    private store: ProjectsContext;
    private projects: Project[];

    constructor(projects: Project[]) {
        this.projects = projects;
        this.store = writable(this);
    }

    getStore() {
        return this.store;
    }

    /** Returns a list of all projects */
    all() {
        return this.projects.slice();
    }

    /** Returns the first project with the given name, if it exists. */
    get(name: string) {
        return this.projects.find((project) => project.name === name);
    }

    /** Replaces the project with the given project */
    revise(project: string | Project, revised: Project) {
        this.projects = this.projects.map((candidate) => {
            if (
                project instanceof Project
                    ? candidate === project
                    : candidate.name === project
            ) {
                candidate.cleanup();

                // Preserve evaluator state.
                const isPlaying = candidate.evaluator.getMode() === Mode.Play;
                if (isPlaying) {
                    // Set the evaluator's playing state to the current playing state.
                    revised.evaluator.setMode(Mode.Play);
                } else {
                    // Play to the same place the old project's evaluator was at.
                    revised.evaluate();
                    revised.evaluator.setMode(Mode.Step);
                }

                return revised;
            } else return candidate;
        });

        // Update the store
        this.store.set(this);
    }

    reviseNodes(project: Project, revisions: [Node, Node | undefined][]) {
        this.revise(project, project.withRevisedNodes(revisions));
    }
}
