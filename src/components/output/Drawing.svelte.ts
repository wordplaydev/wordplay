import { finishStroke, shouldSample } from '@components/output/drawing';
import type { PathPoint } from '@output/Output/Shape/Path';

/**
 * The stage's drawing mode: whether a creator is drawing a path, and the stroke in progress.
 *
 * Shared state rather than props because its three ends are far apart — the toggle is in the
 * palette tile, the gesture is OutputView's, and the preview is drawn by StageView inside the
 * root group — and none of them is an ancestor of the others. Same reason SelectedOutput holds
 * the snap guides.
 *
 * The stroke lives here and **not** in the project: a sample is a pointer move, and revising
 * the program on each one is what made the painting feature this replaces unusable. Only
 * `finish` produces something to commit, once, on release.
 */
export default class Drawing {
    /** Whether a press on the stage starts a stroke rather than selecting or panning. */
    armed: boolean = $state(false);

    /** The stroke being drawn, in stage meters, or empty when there isn't one. */
    points: PathPoint[] = $state([]);

    /** True while a pointer is down and has travelled far enough to be a drag rather than a
     *  click. A drag sweeps a stroke out; a click places one point at a time (#167 asks for
     *  both), and the two can't be told apart until the pointer moves. */
    dragging: boolean = $state(false);

    /** Where a press landed, held until it is known whether it became a drag. */
    pressed: PathPoint | undefined = $state(undefined);

    /** The keyboard's drawing cursor, in stage meters, so a path can be built with no pointer
     *  at all. Kept where it was left, so placing several points in a row is a walk rather than
     *  a series of returns to the origin. */
    cursor: PathPoint = $state({ x: 0, y: 0 });

    constructor() {}

    setArmed(armed: boolean) {
        this.armed = armed;
        // Disarming abandons whatever was in progress: leaving it would draw a preview with no
        // gesture able to finish it.
        if (!armed) this.clear();
    }

    toggle() {
        this.setArmed(!this.armed);
    }

    clear() {
        this.points = [];
        this.dragging = false;
        this.pressed = undefined;
    }

    /** Note where a press landed. Nothing is drawn yet: this is a click until it moves. */
    press(point: PathPoint) {
        this.pressed = point;
    }

    /** The press turned out to be a drag, so the stroke starts where it began. A drag always
     *  starts a new stroke rather than continuing a clicked-out one — sweeping is a whole
     *  gesture, where clicking is one point of many. */
    beginDrag() {
        this.points = this.pressed === undefined ? [] : [this.pressed];
        this.dragging = true;
    }

    /** Forget where a press landed, once it has been dealt with. */
    clearPress() {
        this.pressed = undefined;
    }

    /** Whether a stroke is being built one click at a time, waiting to be ended. */
    get open(): boolean {
        return !this.dragging && this.points.length > 0;
    }

    /** Add a point to the stroke if the pointer has travelled far enough to mean it. */
    extend(point: PathPoint): boolean {
        if (!shouldSample(this.points, point)) return false;
        this.points = [...this.points, point];
        return true;
    }

    /** Add a point unconditionally — what a click or a keypress does, where the creator has
     *  said where the point goes rather than swept past it. */
    add(point: PathPoint) {
        this.points = [...this.points, point];
    }

    /** Move the keyboard cursor. */
    moveCursor(dx: number, dy: number) {
        this.cursor = { x: this.cursor.x + dx, y: this.cursor.y + dy };
    }

    /**
     * The points to commit, or undefined when the stroke was really a dot. Clears either way:
     * a stroke that committed nothing has still ended.
     *
     * Ending a stroke also ends the mode — one press of the pencil, one path. While armed, a
     * press meant to *select* an existing path draws a new one instead, which is inherent to a
     * mode; bounding the mode to a single path is what keeps that from happening over and over.
     * Disarming here rather than at the call site means no future caller can forget it, and
     * makes it something a unit test can see.
     */
    finish(): PathPoint[] | undefined {
        const stroke = finishStroke(this.points);
        this.clear();
        this.armed = false;
        return stroke;
    }
}
