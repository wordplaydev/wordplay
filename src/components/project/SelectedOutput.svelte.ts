import type Project from '@db/projects/Project';
import Evaluate from '@nodes/Evaluate';
import type Node from '@nodes/Node';
import type { Path } from '@nodes/Root';
import type { Guide } from '@components/output/snap';

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

    /**
     * A node *within* the selected output that a palette editor is working on
     * — the note the music editor has focused. When set, the editor outlines
     * this instead of the whole output, so the feedback points at the thing
     * being edited rather than at the several lines containing it. Stored as a
     * path for the same reason the selection is: every edit mints new nodes.
     */
    focus: { source: number | undefined; path: Path | undefined } | null =
        $state(null);

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

    // True while an output is actually being MOVED — past the click/drag threshold on a pointer
    // drag, or briefly after an arrow key. StageView reads it to show the grid faintly for
    // positioning clarity, which is what dragging used to do by force-enabling the creator's
    // own grid toggle and never restoring it.
    moving: boolean = $state(false);

    // What the output being moved is currently lined up with (#117). Written by whichever
    // gesture owns the move — the pointer drag in OutputView, the arrow keys in the output
    // views — and read by StageView, which draws them. Shared state rather than props because
    // the two ends are three levels apart and the gesture owner isn't always the same component.
    guides: Guide[] = $state([]);

    // Which of a selected @Path's point handles has keyboard focus, so it can be restored
    // after the re-mount every revision causes. Local state can't do this: the handles are
    // rebuilt with the shape, so a moved point would lose focus and the next key would go
    // nowhere — which made a run of edits stop after the first one.
    pointFocused: number | undefined = $state(undefined);

    // Non-null while a @Path's point is being dragged: which point, where it was when the
    // gesture began, and where the pointer started. Like rotationDragging and sizeDragging,
    // this lives here rather than in the handle, because the handle re-mounts on every
    // revision and would drop the gesture after its first frame.
    pointDragging: {
        index: number;
        from: { x: number; y: number };
        startX: number;
        startY: number;
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

    setMoving(moving: boolean) {
        this.moving = moving;
        if (!moving) this.guides = [];
    }

    setGuides(guides: Guide[]) {
        this.guides = guides;
    }

    /**
     * True when the creator selected this output on the stage, and so an output view may take
     * keyboard focus. A selection the editor caret or the palette drove must not: focus belongs
     * where the creator is working, and taking it turns their next arrow key into an output move
     * instead of a caret movement.
     */
    shouldTakeFocus() {
        return this.origin === 'output';
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
    /** Point the editor's outline at a node inside the selection. */
    setFocus(project: Project, node: Node | undefined) {
        if (node === undefined) {
            this.focus = null;
            return;
        }
        const source = project.getSourceOf(node);
        this.focus = {
            source:
                source === undefined
                    ? undefined
                    : project.getSources().indexOf(source),
            path: project.getRoot(node)?.getPath(node),
        };
    }

    /** The focused node, if it still resolves in this project. */
    getFocus(project: Project): Node | undefined {
        const focus = this.focus;
        if (focus?.source === undefined || focus.path === undefined)
            return undefined;
        return (
            project.getSources()[focus.source]?.root.resolvePath(focus.path) ??
            undefined
        );
    }

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

    setPointFocused(index: number | undefined) {
        this.pointFocused = index;
    }

    startDraggingPoint(
        index: number,
        from: { x: number; y: number },
        startX: number,
        startY: number,
    ) {
        this.pointDragging = { index, from, startX, startY };
        this.adjusting = true;
        this.dragging = true;
        this.interacting = true;
    }

    stopDraggingPoint() {
        this.pointDragging = null;
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
