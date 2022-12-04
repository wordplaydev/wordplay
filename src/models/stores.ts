import { get, writable, type Writable } from 'svelte/store';
import { examples, makeProject } from '../examples/examples';
import type Step from '../runtime/Step';
import type Project from './Project';

// A global store that contains the project currently being viewed.
export const project: Writable<Project> = writable<Project>();

// A global store that contains the current step of the evaluator.
export const currentStep: Writable<Step | undefined> = writable<Step | undefined>(undefined);

function updateStep() {
    currentStep.set(get(project)?.evaluator.getCurrentStep());
}

export function updateProject(newProject: Project) {

    const oldProject = get(project);
    if(oldProject) {
        oldProject.cleanup();
        oldProject.evaluator.ignore(updateStep);
    }

    newProject.evaluator.observe(updateStep);
    project.set(newProject);

}

updateProject(makeProject(examples[0]));