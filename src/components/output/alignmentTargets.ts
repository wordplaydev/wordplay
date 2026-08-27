/**
 * Turns the rendered scene into the boxes an output being moved can align to
 * (#117). `snap.ts` decides what happens with them; this decides which they are.
 */

import { Free } from '@output/Arrangement/Free';
import { Row } from '@output/Arrangement/Row';
import { Stack } from '@output/Arrangement/Stack';
import Group from '@output/Output/Group';
import type Node from '@nodes/Node';
import type Output from '@output/Output/Output';
import Phrase from '@output/Output/Phrase';
import type { OutputInfo, OutputInfoSet } from '@output/animation/Animator';
import type { Box } from './snap';

export type AlignmentTargets = {
    /** The output being moved, for callers that need the value itself. */
    output: Output;
    /** The moved output, where it currently sits. */
    moved: Box;
    /** What it may align to: its siblings under the same parent. */
    targets: Box[];
    /** Where the moved output's parent sits in stage coordinates, so guides
     *  computed in the parent's frame can be drawn in the stage's. */
    frame: { x: number; y: number };
    /** Which axes the parent arrangement will actually honour. */
    freeX: boolean;
    freeY: boolean;
};

function boxOf(info: OutputInfo): Box {
    const offset =
        info.output instanceof Phrase
            ? info.output.getBaselineOffset(info.context)
            : undefined;
    return {
        label: info.output.getShortDescription(info.context.locales),
        x: info.local.x,
        y: info.local.y,
        width: info.width,
        height: info.height,
        baseline: offset === undefined ? undefined : info.local.y + offset,
    };
}

/**
 * Where a chain of parents sits, in stage coordinates.
 *
 * Deliberately not `Place.offset`, which composes as `y: this.y - place.y` —
 * a local y is measured UP from the parent's bottom edge (see the
 * `parentAscent` term in `toOutputTransform`), so the two accumulate by
 * addition on both axes. The stage's own place is the origin, so it adds
 * nothing.
 */
export function frameOffset(scene: OutputInfoSet, parents: Output[]) {
    let x = 0;
    let y = 0;
    for (const parent of parents) {
        const info = scene.get(parent.getName());
        if (info === undefined) continue;
        x += info.local.x;
        y += info.local.y;
    }
    return { x, y };
}

/**
 * Which axes of a child's place its parent will actually use. A `Row` computes
 * its children's x and a `Stack` their y, so snapping there would promise an
 * alignment the next layout throws away — and announcing it would be a lie. A
 * `Free` group honours a place only for phrases (see `Free.getLayout`).
 */
export function freeAxes(parent: Output | undefined, moved: Output) {
    if (!(parent instanceof Group)) return { freeX: true, freeY: true };
    const arrangement = parent.layout;
    if (arrangement instanceof Row) return { freeX: false, freeY: true };
    if (arrangement instanceof Stack) return { freeX: true, freeY: false };
    if (arrangement instanceof Free)
        return moved instanceof Phrase
            ? { freeX: true, freeY: true }
            : { freeX: false, freeY: false };
    // A Grid computes both.
    return { freeX: false, freeY: false };
}

/**
 * The alignment candidates for whatever output the given expression created.
 *
 * A pointer drag knows the `Evaluate` it selected but not the output's name,
 * which for unnamed output is derived from a node ID and so changes on every
 * revise (`NameGenerator` in Stage.ts). Resolve it once at the start of a
 * gesture: on a paused stage — the only stage that can be edited — nothing else
 * moves and the dragged output's size doesn't change, so the candidates hold
 * for the whole drag.
 */
export function getAlignmentTargetsForCreator(
    scene: OutputInfoSet,
    creator: Node,
): AlignmentTargets | undefined {
    for (const [name, info] of scene)
        if (info.output.value.creator === creator)
            return getAlignmentTargets(scene, name);
    return undefined;
}

/**
 * The alignment candidates for the output named `name`, or undefined when it
 * isn't in the scene (it hasn't been laid out yet, or the stage is mid-revise).
 *
 * Candidates are the moved output's SIBLINGS — entries with the same immediate
 * parent — compared in that parent's local coordinates, which is the frame its
 * `place` bind is written in. Comparing across frames would line up things that
 * only look lined up.
 */
export default function getAlignmentTargets(
    scene: OutputInfoSet,
    name: string,
): AlignmentTargets | undefined {
    const info = scene.get(name);
    if (info === undefined) return undefined;

    const parent = info.parents[0];
    const targets: Box[] = [];
    for (const [otherName, other] of scene) {
        if (otherName === name) continue;
        if (other.parents[0] !== parent) continue;
        // Something with no footprint (a Say, a Music) has no edges to align to.
        if (!other.output.occupiesSpace()) continue;
        targets.push(boxOf(other));
    }

    return {
        output: info.output,
        moved: boxOf(info),
        targets,
        frame: frameOffset(scene, info.parents),
        ...freeAxes(parent, info.output),
    };
}
