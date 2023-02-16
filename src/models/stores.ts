import { get, writable, type Writable } from 'svelte/store';
import { examples, makeProject } from '../examples/examples';
import { Mode, type StreamChange } from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Project from './Project';
import type Conflict from '@conflicts/Conflict';
import type Node from '@nodes/Node';
import Evaluate from '@nodes/Evaluate';

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

/**
 * Create a project global context that stores the current selected value (and if not in an editing mode, nothing).
 * This enables output views like phrases and groups know what mode the output view is in and whether they are selected.
 * so they can render selected feedback.
 */
export const selectedOutput = writable<Evaluate[]>([]);

function updateEvaluatorStores() {
    const evaluator = get(project)?.evaluator;
    if (evaluator) {
        currentStep.set(evaluator.getCurrentStep());
        currentStepIndex.set(evaluator.getStepIndex());
        playing.set(evaluator.isPlaying());
        streams.set(evaluator.reactions);
    }
}

// Clear the selection upon playing.
playing.subscribe((val) => {
    if (val) selectedOutput.set([]);
});

export function updateProject(newProject: Project | undefined) {
    const oldProject = get(project);
    if (oldProject) oldProject.cleanup();

    if (newProject) {
        // If there was an old project, transfer some state.
        if (oldProject) {
            const isPlaying = get(playing);
            if (isPlaying) {
                // Set the evaluator's playing state to the current playing state.
                newProject.evaluator.setMode(Mode.Play);
            } else {
                // Play to the same place the old project's evaluator was at.
                newProject.evaluate();
                newProject.evaluator.setMode(Mode.Step);
            }
        }
        // Have the new evaluator broadcast to this.
        newProject.evaluator.observe(updateEvaluatorStores);
    }

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

    // Map each selected output to its replacement, then set the selected output to the replacements.
    const paths = get(selectedOutput).map(
        (output) =>
            [
                currentProject.getSourceOf(output),
                currentProject.get(output)?.getPath(),
            ] as const
    );

    // Make the new project.
    const newProject = currentProject.withRevisedNodes(replacements);

    // Update the project with the new sources.
    updateProject(newProject);

    // Try to resolve all of the originally selected nodes using the paths.
    selectedOutput.set(
        paths
            .map(([source, path]) => {
                if (source === undefined || path === undefined)
                    return undefined;
                const name = source.getNames()[0];
                if (name === undefined) return undefined;
                const newSource = newProject.getSourceWithName(name);
                if (newSource === undefined) return undefined;
                return newSource.tree.resolvePath(path);
            })
            .filter((output): output is Evaluate => output instanceof Evaluate)
    );
}

let defaultProject: string | undefined = undefined;
if (typeof window !== 'undefined') {
    const priorProject = window.localStorage.getItem('project');
    if (priorProject !== null) defaultProject = priorProject;
}

const matchingProject = examples.find((ex) => ex.name === defaultProject);

updateProject(matchingProject ? makeProject(matchingProject) : undefined);
