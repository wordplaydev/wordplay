/**
 * The geometry of snapping output on stage to the grid and to other output
 * (#117). Pure: no Svelte, no locales, no database, so the decision itself can
 * be tested without a browser. `alignmentTargets.ts` supplies the boxes,
 * `snapDescription.ts` says the result in words.
 *
 * Everything here is in metres, in the coordinate frame of the moved output's
 * PARENT — which is the frame its `place` bind is written in. Comparing boxes
 * across frames would align things that only look aligned.
 */

/** A place is the BOTTOM-LEFT corner of an output's box (see the
 *  `-(root ? 0 : metrics.height)` term in outputToCSS's `toOutputTransform`),
 *  so a box's anchors are derived from x/y upward and rightward. */
export type Box = {
    /** How the output is named to a person, which is what a guide says it lined
     *  up with. Not an identity — an output's internal scene name is derived
     *  from a node ID and would be nonsense to hear. */
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    /** The absolute y of the text baseline, for output that has text. */
    baseline?: number | undefined;
};

export type Axis = 'x' | 'y';

export type Anchor =
    'left' | 'centerX' | 'right' | 'bottom' | 'centerY' | 'top' | 'baseline';

/**
 * The anchors of each axis, in the order ties are broken: a centre reads as the
 * strongest alignment, then the edges, then the baseline, which is the subtlest.
 * Index order is also what `snapDescription` indexes its anchor words by, so
 * this list and that localized list must stay in the same order.
 */
export const XAnchors = ['centerX', 'left', 'right'] as const;
export const YAnchors = ['centerY', 'bottom', 'top', 'baseline'] as const;

/** The lattice both the grid snap and the keyboard step use, in metres. Half a
 *  metre rather than the drawn 1m gridlines: a metre is too coarse for laying
 *  out type, and this keeps the pointer and the arrow keys on one lattice. */
export const SnapIncrement = 0.5;

/** How near a snap engages, in screen pixels. Converted to metres by the caller
 *  against the current camera scale, so snapping feels the same at any zoom. */
export const SnapTolerancePixels = 8;

/** What a snap landed on, both to draw and to say. */
export type Guide = {
    axis: Axis;
    /** Where the line sits, in the parent frame's metres. */
    position: number;
    /** Which anchor of the MOVED box landed on it. */
    anchor: Anchor;
    /** Which anchor of the target it matched; undefined for a gridline. */
    targetAnchor: Anchor | undefined;
    /** How the target output is named to a person; undefined means this is a
     *  gridline. Two constraints on the same anchor and position are treated as
     *  the same by `sameGuides`, so this needs to read well, not to identify. */
    target: string | undefined;
    /** The guide's extent along the OTHER axis, so the drawn line reaches
     *  between the things it relates rather than crossing the whole stage. */
    span: { from: number; to: number };
};

/** Source places are rounded to two decimals (`twoDigits` in OutputView), so a
 *  snapped place must be too — otherwise the drawn guide and the committed
 *  place disagree by whatever the rounding moved. */
function round2(n: number) {
    return Math.round(n * 100) / 100;
}

const Epsilon = 1e-9;

/** Where each of a box's anchors sits on an axis, in tie-breaking order. A box
 *  with no baseline (a group or a shape, which have no text) contributes none. */
export function anchorsOf(box: Box, axis: Axis): [Anchor, number][] {
    return axis === 'x'
        ? [
              ['centerX', box.x + box.width / 2],
              ['left', box.x],
              ['right', box.x + box.width],
          ]
        : [
              ['centerY', box.y + box.height / 2],
              ['bottom', box.y],
              ['top', box.y + box.height],
              ...(box.baseline === undefined
                  ? []
                  : ([['baseline', box.baseline]] as [Anchor, number][])),
          ];
}

/** The same box with its origin at (x, y). The baseline travels with the box,
 *  since it is stored as an absolute position rather than an offset. */
export function boxAt(box: Box, x: number, y: number): Box {
    return {
        ...box,
        x,
        y,
        baseline:
            box.baseline === undefined ? undefined : box.baseline + (y - box.y),
    };
}

/** A box moved so that its origin sits at `origin` on `axis`. */
function movedTo(box: Box, axis: Axis, origin: number): Box {
    const delta = origin - (axis === 'x' ? box.x : box.y);
    return axis === 'x'
        ? { ...box, x: origin }
        : {
              ...box,
              y: origin,
              baseline:
                  box.baseline === undefined ? undefined : box.baseline + delta,
          };
}

/** The extent of a box along the axis PERPENDICULAR to a guide's own. */
function extentOf(box: Box, axis: Axis) {
    return axis === 'x'
        ? { from: box.y, to: box.y + box.height }
        : { from: box.x, to: box.x + box.width };
}

function unionExtent(
    a: { from: number; to: number },
    b: { from: number; to: number },
) {
    return { from: Math.min(a.from, b.from), to: Math.max(a.to, b.to) };
}

/** One way the moved box could land: which of its anchors meets what, and where
 *  its origin would end up. */
type Candidate = {
    anchor: Anchor;
    anchorIndex: number;
    targetAnchor: Anchor | undefined;
    target: Box | undefined;
    /** Where the anchor would sit. */
    position: number;
    /** Where the box's origin would sit on this axis. */
    origin: number;
};

/**
 * A baseline only ever means something against another baseline: a bottom edge
 * landing on someone else's baseline is a coincidence, not an alignment, and
 * saying so out loud is worse than saying nothing. Every other pairing is real
 * — a left edge meeting a right edge is how things abut, and a centre meeting
 * an edge is how something is centred on it.
 */
function pairable(anchor: Anchor, targetAnchor: Anchor) {
    return (anchor === 'baseline') === (targetAnchor === 'baseline');
}

/** Which lattice line an anchor snaps to: the nearest one, or — when a keyboard
 *  is asking for the NEXT alignment — the next one strictly that way. */
function gridLine(at: number, mode: 'nearest' | -1 | 1) {
    const line = at / SnapIncrement;
    return (
        SnapIncrement *
        (mode === 'nearest'
            ? Math.round(line)
            : mode === 1
              ? Math.floor(line + Epsilon) + 1
              : Math.ceil(line - Epsilon) - 1)
    );
}

/** Every way the moved box could align on one axis: to each target's anchors,
 *  and (when the grid is on) to a lattice line for each anchor. */
function candidates(
    moved: Box,
    targets: Box[],
    axis: Axis,
    grid: false | 'nearest' | -1 | 1,
): Candidate[] {
    const origin = axis === 'x' ? moved.x : moved.y;
    const found: Candidate[] = [];
    const movedAnchors = anchorsOf(moved, axis);

    for (const [anchorIndex, [anchor, at]] of movedAnchors.entries()) {
        for (const target of targets)
            for (const [targetAnchor, targetAt] of anchorsOf(target, axis)) {
                if (!pairable(anchor, targetAnchor)) continue;
                found.push({
                    anchor,
                    anchorIndex,
                    targetAnchor,
                    target,
                    position: targetAt,
                    origin: origin + (targetAt - at),
                });
            }
        if (grid !== false) {
            const line = gridLine(at, grid);
            found.push({
                anchor,
                anchorIndex,
                targetAnchor: undefined,
                target: undefined,
                position: line,
                origin: origin + (line - at),
            });
        }
    }
    return found;
}

/** Turn a chosen candidate into the guide to draw, measured from where the box
 *  ACTUALLY lands (after rounding), not from where the candidate wanted it. */
function toGuide(
    moved: Box,
    axis: Axis,
    landedOrigin: number,
    candidate: Candidate,
): Guide {
    const landed = movedTo(moved, axis, landedOrigin);
    const position =
        anchorsOf(landed, axis).find(([a]) => a === candidate.anchor)?.[1] ??
        candidate.position;
    return {
        axis,
        position,
        anchor: candidate.anchor,
        targetAnchor: candidate.targetAnchor,
        target: candidate.target?.label,
        span:
            candidate.target === undefined
                ? extentOf(landed, axis)
                : unionExtent(
                      extentOf(landed, axis),
                      extentOf(candidate.target, axis),
                  ),
    };
}

/**
 * Where a moved box should land, and what it aligned to.
 *
 * Per axis, the nearest candidate within `tolerance` wins. Alignment to other
 * output outranks the grid at equal distance — a creator lining type up cares
 * more about the other type than about a round number — and anchors break
 * remaining ties in `XAnchors`/`YAnchors` order.
 *
 * `freeX`/`freeY` say which axes the parent arrangement will actually honour: a
 * `Row` computes its children's x, so snapping (and announcing) x there would
 * promise an alignment that never happens.
 */
export function snapPlace(
    moved: Box,
    targets: Box[],
    options: {
        tolerance: number;
        grid: boolean;
        freeX: boolean;
        freeY: boolean;
    },
): { x: number; y: number; guides: Guide[] } {
    const result = { x: moved.x, y: moved.y, guides: [] as Guide[] };

    for (const axis of ['x', 'y'] as const) {
        if (axis === 'x' ? !options.freeX : !options.freeY) continue;
        const origin = axis === 'x' ? moved.x : moved.y;
        let best: { candidate: Candidate; delta: number } | undefined;
        for (const candidate of candidates(
            moved,
            targets,
            axis,
            options.grid ? 'nearest' : false,
        )) {
            const delta = Math.abs(candidate.origin - origin);
            if (delta > options.tolerance + Epsilon) continue;
            if (best === undefined) {
                best = { candidate, delta };
                continue;
            }
            // Nearer wins; then output over grid; then anchor order.
            if (delta < best.delta - Epsilon) best = { candidate, delta };
            else if (delta <= best.delta + Epsilon) {
                const wasGrid = best.candidate.target === undefined;
                const isGrid = candidate.target === undefined;
                if (wasGrid && !isGrid) best = { candidate, delta };
                else if (
                    wasGrid === isGrid &&
                    candidate.anchorIndex < best.candidate.anchorIndex
                )
                    best = { candidate, delta };
            }
        }
        if (best === undefined) continue;
        const landed = round2(best.candidate.origin);
        if (axis === 'x') result.x = landed;
        else result.y = landed;
        result.guides.push(toGuide(moved, axis, landed, best.candidate));
    }

    return result;
}

/**
 * The next alignment strictly beyond where the box is now, in one direction —
 * how a keyboard reaches an alignment further away than one step. Unlike
 * `snapPlace` this ignores tolerance: it is an explicit "go align with the next
 * thing that way", not a constraint that engages when you happen to be near.
 */
export function nextAlignment(
    moved: Box,
    targets: Box[],
    options: { axis: Axis; direction: -1 | 1; grid: boolean },
): { position: number; guide: Guide } | undefined {
    const { axis, direction } = options;
    const origin = axis === 'x' ? moved.x : moved.y;
    let best: { candidate: Candidate; landed: number } | undefined;

    for (const candidate of candidates(
        moved,
        targets,
        axis,
        options.grid ? direction : false,
    )) {
        // Round first: a candidate that rounds back to where we already are is
        // not somewhere to go, and would make the key press do nothing.
        const landed = round2(candidate.origin);
        const delta = (landed - origin) * direction;
        if (delta <= Epsilon) continue;
        if (
            best === undefined ||
            delta < (best.landed - origin) * direction - Epsilon
        )
            best = { candidate, landed };
    }

    if (best === undefined) return undefined;
    return {
        position: best.landed,
        guide: toGuide(moved, axis, best.landed, best.candidate),
    };
}

/** The same guide in another coordinate frame — the moved output's parent sits
 *  somewhere on the stage, and the stage is where guides are drawn. */
export function offsetGuide(guide: Guide, frame: { x: number; y: number }) {
    const along = guide.axis === 'x' ? frame.x : frame.y;
    const across = guide.axis === 'x' ? frame.y : frame.x;
    return {
        ...guide,
        position: guide.position + along,
        span: { from: guide.span.from + across, to: guide.span.to + across },
    };
}

/** Whether two guide sets describe the same constraints, so a drag can announce
 *  only when what it is snapped to actually changes rather than every frame. */
export function sameGuides(a: Guide[], b: Guide[]) {
    if (a.length !== b.length) return false;
    return a.every((guide, index) => {
        const other = b[index];
        return (
            guide.axis === other.axis &&
            guide.anchor === other.anchor &&
            guide.targetAnchor === other.targetAnchor &&
            guide.target === other.target &&
            Math.abs(guide.position - other.position) < 0.005
        );
    });
}
