import type Project from '@db/projects/Project';
import Evaluate from '@nodes/Evaluate';
import type { Path } from '@nodes/Root';

type SelectedOutputPaths = {
    source: number | undefined;
    path: Path | undefined;
}[];

type SelectedPhrase = { name: string; index: number | null } | null;

/**
 * A composite state that stores the current selected value (and if not in an editing mode, nothing).
 * This enables output views like phrases and groups know what mode the output view is in and whether they are selected.
 * so they can render selected feedback.
 */
export default class SelectedOutput {
    // The selected output expressions.
    paths: SelectedOutputPaths = $state([]);

    // The phrase selected and the index in the phrase text that we are editing.
    phrase: SelectedPhrase | null = $state(null);

    constructor() {}

    hasPaths() {
        return this.paths.length > 0;
    }

    hasPhrase() {
        return this.phrase !== null;
    }

    isEmpty() {
        return !this.hasPaths() && !this.hasPhrase();
    }

    empty() {
        this.paths = [];
        this.phrase = null;
    }

    includes(code: Evaluate, project: Project) {
        return this.getOutput(project).includes(code);
    }

    /** Resolve the paths with the given project */
    getOutput(project: Project) {
        return this.paths
            .map(({ source, path }) => {
                if (
                    source === undefined ||
                    path === undefined ||
                    project === undefined
                )
                    return undefined;
                const newSource = project.getSources()[source];
                if (newSource === undefined) return undefined;
                return newSource.root.resolvePath(path);
            })
            .filter((output): output is Evaluate => output instanceof Evaluate);
    }

    getPhrase() {
        return this.phrase;
    }

    setPaths(project: Project, evaluates: Evaluate[]) {
        // Map each selected output to its replacement, then set the selected output to the replacements.
        this.paths = evaluates.map((output) => {
            const source = project.getSourceOf(output);
            return {
                source:
                    source === undefined
                        ? undefined
                        : project.getSources().indexOf(source),
                path: project.getRoot(output)?.getPath(output),
            };
        });
    }

    setPhrase(phrase: SelectedPhrase) {
        this.phrase = phrase;
    }
}
