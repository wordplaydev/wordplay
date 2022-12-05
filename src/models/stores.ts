import { get, writable, type Writable } from 'svelte/store';
import { examples, makeProject } from '../examples/examples';
import type Step from '../runtime/Step';
import type Project from './Project';

// A global store that contains the project currently being viewed.
export const project: Writable<Project> = writable<Project>();

// A global store that contains the current step of the evaluator.
export const currentStep: Writable<Step | undefined> = writable<Step | undefined>(undefined);

// A global store that contains the play/pause mode of the evaluator.
export const playing: Writable<boolean> = writable<boolean>(true);

function updateEvaluatorStores() {
    const evaluator = get(project)?.evaluator;
    if(evaluator) {
        currentStep.set(evaluator.getCurrentStep());
        playing.set(evaluator.isPlaying())
    }
}

export function updateProject(newProject: Project) {

    const oldProject = get(project);
    if(oldProject) {
        oldProject.cleanup();
        oldProject.evaluator.ignore(updateEvaluatorStores);
    }

    newProject.evaluator.observe(updateEvaluatorStores);
    project.set(newProject);

}

updateProject(makeProject(examples[0]));