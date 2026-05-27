import type Project from '@db/projects/Project';
import Evaluate from '@nodes/Evaluate';
import type { Path } from '@nodes/Root';

type SelectionOrigin = 'editor' | 'output' | 'palette';

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

    // Remember how it was it selected.
    origin: SelectionOrigin | null = $state(null);

    // True while a palette input is mid-gesture (slider drag, text focus), so
    // the stage can suppress fit-to-content and avoid jumping during edits.
    adjusting: boolean = $state(false);

    // True when the rotation handle has keyboard focus, so it can be restored after re-mount.
    rotationFocused: boolean = $state(false);

    // Non-null during a rotation drag, storing the initial angle and initial rotation degrees
    // so the drag can be resumed after a re-mount caused by Projects.revise().
    rotationDragging: { startAngle: number; startDegrees: number } | null =
        $state(null);

    // True when the size handle has keyboard focus, so it can be restored after re-mount.
    sizeFocused: boolean = $state(false);

    // Non-null during a size drag, storing the initial distance and initial size in meters.
    sizeDragging: { startDistance: number; startSize: number } | null =
        $state(null);

    constructor() {}

    setAdjusting(adjusting: boolean) {
        this.adjusting = adjusting;
    }

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

    setPaths(project: Project, evaluates: Evaluate[], origin: SelectionOrigin) {
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
        this.origin = origin;
    }

    setPhrase(phrase: SelectedPhrase) {
        this.phrase = phrase;
        this.origin = 'output';
    }

    setRotationFocused(focused: boolean) {
        this.rotationFocused = focused;
    }

    startRotating(startAngle: number, startDegrees: number) {
        this.rotationDragging = { startAngle, startDegrees };
        this.adjusting = true;
    }

    stopRotating() {
        this.rotationDragging = null;
        this.adjusting = false;
    }

    setSizeFocused(focused: boolean) {
        this.sizeFocused = focused;
    }

    startSizing(startDistance: number, startSize: number) {
        this.sizeDragging = { startDistance, startSize };
        this.adjusting = true;
    }

    stopSizing() {
        this.sizeDragging = null;
        this.adjusting = false;
    }
}
