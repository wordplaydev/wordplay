import type { WritingDirection, WritingLayout } from '@locale/Scripts';

/**
 * The editor's geometry is not really horizontal — it is *inline-axis* geometry
 * that happens to be horizontal in the writing modes we used to support. This
 * module is the one place that knows which physical axis each logical axis
 * currently lives on, so everything downstream (row clustering, caret
 * placement, selection outlines, pointer hit-testing) can be written once in
 * logical terms and be correct in all four writing modes.
 *
 * The projection is *container-relative and monotone*: a larger `inline` is
 * always later in the line and a larger `block` is always a later line, in
 * every mode. That is what lets the existing algorithms keep their `<`,
 * `Math.min`, and sort comparators untouched — including for RTL, which this
 * subsumes rather than sits beside.
 */

export type RectLike = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

/** A rectangle in the logical basis, with start always ≤ end on both axes. */
export type LogicalRect = {
    /** Along the text. Larger is later in the line. */
    inlineStart: number;
    inlineEnd: number;
    /** Across lines. Larger is a later line. */
    blockStart: number;
    blockEnd: number;
};

export type LogicalPoint = { inline: number; block: number };

export type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export const ArrowKeys: ArrowKey[] = [
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
];

export function isArrowKey(key: string): key is ArrowKey {
    return (
        key === 'ArrowLeft' ||
        key === 'ArrowRight' ||
        key === 'ArrowUp' ||
        key === 'ArrowDown'
    );
}

/** Which logical axis a caret motion travels along, and which way. */
export type CaretMotion = { axis: 'inline' | 'block'; direction: -1 | 1 };

/** Which physical axis a logical axis occupies, and whether it runs with or
 *  against that axis's increasing direction. */
type Placement = { axis: 'x' | 'y'; sign: 1 | -1 };

/** The physical axis and sign each arrow key travels. */
const KeyPlacements: Record<ArrowKey, Placement> = {
    ArrowLeft: { axis: 'x', sign: -1 },
    ArrowRight: { axis: 'x', sign: 1 },
    ArrowUp: { axis: 'y', sign: -1 },
    ArrowDown: { axis: 'y', sign: 1 },
};

/** Where the inline and block axes sit, per writing mode. `vertical-rl` is the
 *  only mode whose lines progress against their physical axis, which is why it
 *  is the only one that needs the container's extent to place anything. */
function placements(
    layout: WritingLayout,
    direction: WritingDirection,
): { inline: Placement; block: Placement } {
    return layout === 'horizontal-tb'
        ? {
              inline: { axis: 'x', sign: direction === 'rtl' ? -1 : 1 },
              block: { axis: 'y', sign: 1 },
          }
        : {
              inline: { axis: 'y', sign: 1 },
              block: { axis: 'x', sign: layout === 'vertical-rl' ? -1 : 1 },
          };
}

/** Which caret motion an arrow key means in a writing mode. Standalone because
 *  key mapping needs no geometry: a command dispatched with no mounted editor
 *  still has to know that Up means "back along the text" when writing vertically. */
export function motionForKey(
    key: ArrowKey,
    layout: WritingLayout,
    direction: WritingDirection,
): CaretMotion {
    const { inline, block } = placements(layout, direction);
    const pressed = KeyPlacements[key];
    const along = pressed.axis === inline.axis ? inline : block;
    return {
        axis: pressed.axis === inline.axis ? 'inline' : 'block',
        direction: pressed.sign === along.sign ? 1 : -1,
    };
}

/** The inverse of {@link motionForKey}, for showing a command's shortcut. */
export function keyForMotion(
    motion: CaretMotion,
    layout: WritingLayout,
    direction: WritingDirection,
): ArrowKey {
    const { inline, block } = placements(layout, direction);
    const along = motion.axis === 'inline' ? inline : block;
    const sign = motion.direction === 1 ? along.sign : -along.sign;
    return along.axis === 'x'
        ? sign === 1
            ? 'ArrowRight'
            : 'ArrowLeft'
        : sign === 1
          ? 'ArrowDown'
          : 'ArrowUp';
}

export type Axes = {
    readonly layout: WritingLayout;
    readonly direction: WritingDirection;
    /** True when the inline axis runs along physical x — i.e. text reads across
     *  the screen rather than down it. */
    readonly horizontal: boolean;
    /** Project a viewport-space rectangle into the logical basis. */
    rect(r: RectLike): LogicalRect;
    /** Project a viewport-space point into the logical basis. */
    point(clientX: number, clientY: number): LogicalPoint;
    /**
     * The block-axis span of a rectangle, and whether a block coordinate falls
     * inside it, as scalars. These exist because `rect` allocates — three
     * objects — and the pointer code tests every token view in the source on
     * every pointer move while a selection is being dragged. Projecting first
     * and filtering second turned a zero-allocation comparison into thousands of
     * short-lived objects a second; these keep the filter free and leave `rect`
     * for the few elements that survive it.
     */
    blockStart(r: RectLike): number;
    blockEnd(r: RectLike): number;
    containsBlock(r: RectLike, block: number): boolean;
    /** Invert `point`: logical back to container-relative CSS offsets, which is
     *  what an absolutely positioned child needs. */
    place(point: LogicalPoint): { left: number; top: number };
    /** Invert `point` all the way back to viewport coordinates, for handing a
     *  logical position to something that hit-tests in client space. */
    client(point: LogicalPoint): { clientX: number; clientY: number };
    /** Map a logical extent onto CSS width and height. */
    size(inline: number, block: number): { width: number; height: number };
    /** The container-relative CSS box of a logical rectangle. Takes the corners
     *  rather than one origin, since a negated axis puts the logical start on
     *  the far physical side. */
    box(rect: LogicalRect): {
        left: number;
        top: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
    };
    /** Which caret motion an arrow key means in this writing mode. */
    motionForKey(key: ArrowKey): CaretMotion;
    /** Which arrow key produces a motion — the inverse, for showing shortcuts. */
    keyForMotion(motion: CaretMotion): ArrowKey;
};

/**
 * Build the projection for a writing mode and the container the editor is laid
 * out in. `container` is the viewport rectangle in client coordinates; every
 * value `point`/`rect` produce is relative to its logical origin, and every
 * value `place` produces is relative to its physical top-left, which is what
 * absolutely-positioned children need.
 */
export default function createAxes(
    layout: WritingLayout,
    direction: WritingDirection,
    container: RectLike,
): Axes {
    const { inline, block } = placements(layout, direction);
    const width = container.right - container.left;
    const height = container.bottom - container.top;

    /** Project one physical coordinate onto one logical axis. */
    function project(p: Placement, x: number, y: number): number {
        return p.axis === 'x'
            ? p.sign === 1
                ? x - container.left
                : container.right - x
            : p.sign === 1
              ? y - container.top
              : container.bottom - y;
    }

    /** Turn a logical coordinate back into a container-relative physical one. */
    function unproject(p: Placement, value: number): number {
        const extent = p.axis === 'x' ? width : height;
        return p.sign === 1 ? value : extent - value;
    }

    return {
        layout,
        direction,
        horizontal: inline.axis === 'x',
        point(clientX, clientY) {
            return {
                inline: project(inline, clientX, clientY),
                block: project(block, clientX, clientY),
            };
        },
        blockStart(r) {
            return Math.min(
                project(block, r.left, r.top),
                project(block, r.right, r.bottom),
            );
        },
        blockEnd(r) {
            return Math.max(
                project(block, r.left, r.top),
                project(block, r.right, r.bottom),
            );
        },
        containsBlock(r, at) {
            const a = project(block, r.left, r.top);
            const b = project(block, r.right, r.bottom);
            return a < b ? at >= a && at <= b : at >= b && at <= a;
        },
        rect(r) {
            // Project both corners and order them: a negated axis swaps which
            // physical edge is the logical start.
            const a = this.point(r.left, r.top);
            const b = this.point(r.right, r.bottom);
            return {
                inlineStart: Math.min(a.inline, b.inline),
                inlineEnd: Math.max(a.inline, b.inline),
                blockStart: Math.min(a.block, b.block),
                blockEnd: Math.max(a.block, b.block),
            };
        },
        place(point) {
            const i = unproject(inline, point.inline);
            const b = unproject(block, point.block);
            return inline.axis === 'x'
                ? { left: i, top: b }
                : { left: b, top: i };
        },
        client(point) {
            const { left, top } = this.place(point);
            return {
                clientX: left + container.left,
                clientY: top + container.top,
            };
        },
        box(rect) {
            const a = this.place({
                inline: rect.inlineStart,
                block: rect.blockStart,
            });
            const b = this.place({
                inline: rect.inlineEnd,
                block: rect.blockEnd,
            });
            const left = Math.min(a.left, b.left);
            const top = Math.min(a.top, b.top);
            const right = Math.max(a.left, b.left);
            const bottom = Math.max(a.top, b.top);
            return {
                left,
                top,
                right,
                bottom,
                width: right - left,
                height: bottom - top,
            };
        },
        size(inlineExtent, blockExtent) {
            return inline.axis === 'x'
                ? { width: inlineExtent, height: blockExtent }
                : { width: blockExtent, height: inlineExtent };
        },
        motionForKey(key) {
            return motionForKey(key, layout, direction);
        },
        keyForMotion(motion) {
            return keyForMotion(motion, layout, direction);
        },
    };
}

/** The projection for a rendered editor, measured from its own box. The editor
 *  is the positioning ancestor of the caret and highlight overlays, so it is
 *  the frame `place` must be relative to. */
export function editorAxes(
    editor: HTMLElement | null,
    layout: WritingLayout,
    direction: WritingDirection,
): Axes {
    // A null editor only happens where nothing is placed — the source-line
    // resolver, which reads relative distances. `point` and `client` still
    // invert each other against an empty frame, so the projection stays sound.
    return createAxes(
        layout,
        direction,
        editor?.getBoundingClientRect() ?? {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
        },
    );
}

/**
 * The arrow key that means, in a horizontal left-to-right editor, what `key`
 * means in this writing mode. Writing vertically puts the inline axis on the
 * screen's vertical axis, so Up and Down move along the text while Left and
 * Right move between lines; translating the keystroke lets every command keep
 * the meaning — and the localized description — it already has.
 *
 * Horizontal modes are returned unchanged, RTL included: the inline commands
 * already mirror themselves from the writing direction, and rerouting them here
 * would also mirror blocks mode, which deliberately doesn't mirror today.
 */
export function remapArrowKey(
    key: string,
    layout: WritingLayout,
    direction: WritingDirection,
): string {
    if (layout === 'horizontal-tb' || !isArrowKey(key)) return key;
    return keyForMotion(
        motionForKey(key, layout, direction),
        'horizontal-tb',
        'ltr',
    );
}
