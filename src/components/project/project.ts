import { get } from 'svelte/store';
import type Project from '@models/Project';
import Evaluate from '@nodes/Evaluate';
import { Mode } from '@runtime/Evaluator';
import type { ProjectContext, SelectedOutputContext } from './Contexts';
import type Node from '@nodes/Node';

export function updateProject(
    project: ProjectContext,
    newProject: Project | undefined
) {
    const oldProject = get(project);
    if (oldProject) oldProject.cleanup();

    if (newProject) {
        // If there was an old project, transfer some state.
        if (oldProject) {
            const isPlaying = oldProject.evaluator.getMode() === Mode.Play;
            if (isPlaying) {
                // Set the evaluator's playing state to the current playing state.
                newProject.evaluator.setMode(Mode.Play);
            } else {
                // Play to the same place the old project's evaluator was at.
                newProject.evaluate();
                newProject.evaluator.setMode(Mode.Step);
            }
        }
    }

    project.set(newProject);
}

/**
 * Create a new project with the given node replacements and update the selected output nodes with the replacements.
 */
export function reviseProject(
    project: ProjectContext,
    selectedOutput: SelectedOutputContext,
    replacements: [Node, Node | undefined][]
) {
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
    updateProject(project, newProject);

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

export type SelectedPhraseType = {
    name: string;
    index: number | null;
} | null;
