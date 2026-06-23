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

    // True for the whole duration of a handle rotate/size drag. The stable OutputView owns the
    // drag listeners and gates them on this flag — which (unlike rotationDragging/sizeDragging,
    // whose identity changes mid-resize via advanceSizing) stays steady across the whole gesture,
    // so the listeners attach once and never gap as the output view re-mounts on each revise. It
    // also guards the selection-clearing paths so a stray event can't drop the dragged selection.
    dragging: boolean = $state(false);

    // True for the whole duration of ANY on-stage output gesture — move OR rotate OR resize (but
    // NOT palette slider/text gestures, which use `adjusting`). ProjectView reads this to defer the
    // heavy per-edit work (conflict analysis, concept-index rebuild) during a drag and flush once on
    // release, so the stage stays responsive. Distinct from `dragging` (which gates the handle-drag
    // listener and so can't be set for a move) and `adjusting` (also true for palette gestures).
    interacting: boolean = $state(false);

    // True when the rotation handle has keyboard focus, so it can be restored after re-mount.
    rotationFocused: boolean = $state(false);

    // Non-null during a rotation drag, storing the initial angle/rotation and the output's
    // screen-space center (cx, cy), captured once at gesture start. The center is reused for the
    // whole drag so the gesture doesn't re-query the output's DOM element each frame — that lookup
    // races the one-step evaluation lag (the rendered element's data-node-id lags $project after a
    // revise) and would otherwise freeze the drag.
    rotationDragging: {
        startAngle: number;
        startDegrees: number;
        cx: number;
        cy: number;
    } | null = $state(null);

    // True when the size handle has keyboard focus, so it can be restored after re-mount.
    sizeFocused: boolean = $state(false);

    // Non-null during a size drag; like rotationDragging, holds the captured output center (cx, cy).
    sizeDragging: {
        startDistance: number;
        startSize: number;
        cx: number;
        cy: number;
    } | null = $state(null);

    constructor() {}

    setAdjusting(adjusting: boolean) {
        this.adjusting = adjusting;
    }

    setInteracting(interacting: boolean) {
        this.interacting = interacting;
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

    /** Add the given output to the selection if absent, or remove it if present. Used for keyboard
     *  (Space) and shift-click multi-select. Clears any phrase text-edit, since the acted-on set
     *  changed. */
    toggle(project: Project, evaluate: Evaluate) {
        const current = this.getOutput(project);
        const index = current.indexOf(evaluate);
        const next =
            index >= 0
                ? [...current.slice(0, index), ...current.slice(index + 1)]
                : [...current, evaluate];
        this.setPaths(project, next, 'output');
        this.setPhrase(null);
    }

    /** Select exactly the given set of outputs (e.g. keyboard Cmd/Ctrl+A "select all"). */
    selectAll(project: Project, evaluates: Evaluate[]) {
        this.setPaths(project, evaluates, 'output');
        this.setPhrase(null);
    }

    setRotationFocused(focused: boolean) {
        this.rotationFocused = focused;
    }

    startRotating(
        startAngle: number,
        startDegrees: number,
        cx: number,
        cy: number,
    ) {
        this.rotationDragging = { startAngle, startDegrees, cx, cy };
        this.adjusting = true;
        this.dragging = true;
        this.interacting = true;
    }

    stopRotating() {
        this.rotationDragging = null;
        this.adjusting = false;
        this.dragging = false;
        this.interacting = false;
    }

    setSizeFocused(focused: boolean) {
        this.sizeFocused = focused;
    }

    startSizing(
        startDistance: number,
        startSize: number,
        cx: number,
        cy: number,
    ) {
        this.sizeDragging = { startDistance, startSize, cx, cy };
        this.adjusting = true;
        this.dragging = true;
        this.interacting = true;
    }

    /** Advance the size drag's reference distance, so an incremental-scaling resize (e.g. a Shape
     *  resizing its form) computes the next frame's ratio relative to the latest pointer position
     *  rather than the original — and survives the re-mount that each Projects.revise() triggers. */
    advanceSizing(distance: number) {
        if (this.sizeDragging)
            this.sizeDragging = {
                ...this.sizeDragging,
                startDistance: distance,
            };
    }

    stopSizing() {
        this.sizeDragging = null;
        this.adjusting = false;
        this.dragging = false;
        this.interacting = false;
    }
}
