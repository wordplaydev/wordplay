import { get, writable, type Writable } from 'svelte/store';
import { examples, makeProject } from '../examples/examples';
import type { StreamChange } from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Project from './Project';
import type Conflict from '@conflicts/Conflict';
import type Node from '@nodes/Node';

// A global store that contains the project currently being viewed.
export const project: Writable<Project | undefined> = writable<
    Project | undefined
>();

// A global store that contains the current step of the evaluator.
export const currentStep: Writable<Step | undefined> = writable<
    Step | undefined
>(undefined);

// A global store that contains the current step of the evaluator.
export const currentStepIndex: Writable<number> = writable<number>(0);

// A global store that contains the play/pause mode of the evaluator.
export const playing: Writable<boolean> = writable<boolean>(true);

// A global store that contains the stream history of the evaluator.
export const streams: Writable<StreamChange[]> = writable<StreamChange[]>([]);

// A global store that contains the active animations of the evaluator.
export const animatingNodes: Writable<Set<Node>> = writable<Set<Node>>(
    new Set()
);

// A global store of project conflicts
export const nodeConflicts: Writable<Conflict[]> = writable([]);

function updateEvaluatorStores() {
    const evaluator = get(project)?.evaluator;
    if (evaluator) {
        currentStep.set(evaluator.getCurrentStep());
        currentStepIndex.set(evaluator.getStepIndex());
        playing.set(evaluator.isPlaying());
        streams.set(evaluator.reactions);
    }
}

/**
 * Create a project global context that stores the current selected value (and if not in an editing mode, nothing).
 * This enables output views like phrases and groups know what mode the output view is in and whether they are selected.
 * so they can render selected feedback.
 */
export const selectedOutput = writable<Node[]>([]);

export function updateProject(newProject: Project | undefined) {
    const oldProject = get(project);
    if (oldProject) oldProject.cleanup();

    if (newProject) newProject.evaluator.observe(updateEvaluatorStores);

    project.set(newProject);

    if (typeof window !== 'undefined') {
        if (newProject) window.localStorage.setItem('project', newProject.name);
        else window.localStorage.removeItem('project');
    }
}

/**
 * Create a new project with the given node replacements and update the selected output nodes with the replacements.
 */
export function reviseProject(replacements: [Node, Node | undefined][]) {
    const currentProject = get(project);
    if (currentProject === undefined) return;

    // Replace the old selected output with the new one
    selectedOutput.set(
        get(selectedOutput).map((n) => {
            const rep = replacements.find((rep) => rep[0] === n);
            return rep === undefined || rep[1] === undefined ? n : rep[1];
        })
    );

    // Update the project with the new sources.
    updateProject(currentProject.withRevisedNodes(replacements));
}

let defaultProject: string | undefined = undefined;
if (typeof window !== 'undefined') {
    const priorProject = window.localStorage.getItem('project');
    if (priorProject !== null) defaultProject = priorProject;
}

const matchingProject = examples.find((ex) => ex.name === defaultProject);

updateProject(matchingProject ? makeProject(matchingProject) : undefined);
