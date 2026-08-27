/**
 * Moving output on stage with the keyboard (#117) — one home for what
 * PhraseView, GroupView, and ShapeView each used to spell out.
 *
 * Plain arrows step the snap lattice; Shift+arrow jumps to the next alignment
 * that way, which is how a keyboard reaches an alignment further off than one
 * step. Alt+arrow is left alone: that is the stage's output-to-output focus
 * navigation.
 *
 * Every press announces where it landed and what constrained it. It previously
 * announced nothing at all — `describeMovedOutput` fires only from StageView,
 * which is gated on playing, and a keyboard move happens while paused.
 */

import moveOutput from '@components/palette/editOutput';
import type SelectedOutput from '@components/project/SelectedOutput.svelte';
import type { AnnouncerContext } from '@components/project/Contexts';
import type { Database } from '@db/Database';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type Evaluate from '@nodes/Evaluate';
import type Output from '@output/Output/Output';
import Shape from '@output/Output/Shape/Shape';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { getOrCreatePlace } from '@output/Place/getOrCreatePlace';
import type { OutputInfoSet } from '@output/animation/Animator';
import getAlignmentTargets from './alignmentTargets';
import {
    SnapIncrement,
    SnapTolerancePixels,
    boxAt,
    nextAlignment,
    offsetGuide,
    snapPlace,
    type Axis,
    type Box,
    type Guide,
} from './snap';
import describeMove, { describeNoAlignment } from './snapDescription';

/**
 * How long a keyboard move's guides stay drawn. A pointer drag clears its own
 * on release; a key press has no release, and a guide left behind describes a
 * constraint that is no longer being applied.
 */
const GuideLinger = 1500;

let lingering: ReturnType<typeof setTimeout> | undefined;

export type KeyboardMoveContext = {
    db: Database;
    project: Project;
    /** The Evaluate whose place bind is revised. */
    creator: Evaluate;
    /** The rendered output, for its scene name and its shape-ness. */
    output: Output;
    locales: Locales;
    /** Lays out what's on stage, which supplies the alignment candidates. Called
     *  only once a press turns out to be an arrow, since it is a full layout pass. */
    scene: (() => OutputInfoSet) | undefined;
    /** Whether the creator turned the grid on, which is what enables grid snapping. */
    grid: boolean;
    selection: SelectedOutput | undefined;
    announce: AnnouncerContext;
};

/**
 * A Shape's editable position is its form's TOP-left anchor (see
 * `getOrCreatePlace` and `moveOutput`), while every box here is measured from
 * its bottom-left. Everything else places from the bottom-left already.
 */
export function shapeYOffset(output: Output, height: number) {
    return output instanceof Shape ? height : 0;
}

/** Which axis and which way an arrow key asks for, or nothing if it isn't one. */
export function arrowMove(
    key: string,
): { axis: Axis; direction: -1 | 1 } | undefined {
    return key === 'ArrowLeft'
        ? { axis: 'x', direction: -1 }
        : key === 'ArrowRight'
          ? { axis: 'x', direction: 1 }
          : key === 'ArrowDown'
            ? { axis: 'y', direction: -1 }
            : key === 'ArrowUp'
              ? { axis: 'y', direction: 1 }
              : undefined;
}

function publish(selection: SelectedOutput | undefined, guides: Guide[]) {
    if (selection === undefined) return;
    selection.setMoving(true);
    selection.setGuides(guides);
    if (lingering !== undefined) clearTimeout(lingering);
    lingering = setTimeout(() => {
        lingering = undefined;
        selection.setMoving(false);
    }, GuideLinger);
}

/**
 * Move the given output one arrow press, and say what happened. Returns whether
 * the press was handled, so the caller can leave anything else alone.
 */
export default function moveOutputWithKey(
    event: KeyboardEvent,
    context: KeyboardMoveContext,
): boolean {
    const move = arrowMove(event.key);
    if (move === undefined) return false;
    const { axis, direction } = move;

    const { db, project, creator, output, locales, grid, selection } = context;
    const nodeContext = project.getNodeContext(creator);
    const place = getOrCreatePlace(project, locales, creator, nodeContext);
    // No literal place to revise (it's a computed expression) — leave it alone.
    if (place === undefined) return false;

    const scene = context.scene?.();
    const alignment = scene
        ? getAlignmentTargets(scene, output.getName())
        : undefined;

    // The box as it will be committed: positioned from the place we are about to
    // rewrite rather than from the scene, so snapping and the revision can't
    // disagree when the scene is a frame behind an edit.
    const offset = alignment ? shapeYOffset(output, alignment.moved.height) : 0;
    const current: Box = alignment
        ? boxAt(alignment.moved, place.x, place.y - offset)
        : {
              label: output.getShortDescription(locales),
              x: place.x,
              y: place.y,
              width: 0,
              height: 0,
          };
    const targets = alignment?.targets ?? [];
    const free =
        axis === 'x' ? (alignment?.freeX ?? true) : (alignment?.freeY ?? true);

    let landed = { x: current.x, y: current.y };
    let guides: Guide[] = [];

    if (event.shiftKey) {
        const next = free
            ? nextAlignment(current, targets, { axis, direction, grid })
            : undefined;
        if (next === undefined) {
            // Constant text by nature, so it goes out on the interrupt lane,
            // which re-presents identical text rather than dropping it.
            context.announce?.(
                'ignored',
                locales.getLocale().language,
                describeNoAlignment(locales, axis, direction),
            );
            event.stopPropagation();
            return true;
        }
        landed = { ...landed, [axis]: next.position };
        guides = [next.guide];
    } else {
        const stepped = boxAt(
            current,
            axis === 'x' ? current.x + SnapIncrement * direction : current.x,
            axis === 'y' ? current.y + SnapIncrement * direction : current.y,
        );
        // With the grid on, half the step is enough to always land on the
        // lattice; with it off, only a near alignment should pull the step off
        // where the key asked for. Either way the window sits entirely beyond
        // where we started, so an arrow can never move something backwards.
        const result = snapPlace(stepped, targets, {
            tolerance: grid
                ? SnapIncrement / 2
                : SnapTolerancePixels / PX_PER_METER,
            grid,
            // Only the axis being moved: snapping the other one would move the
            // output in a direction the creator didn't ask for.
            freeX: axis === 'x' && free,
            freeY: axis === 'y' && free,
        });
        landed = { x: result.x, y: result.y };
        guides = result.guides;
    }

    event.stopPropagation();

    moveOutput(
        db,
        project,
        [creator],
        locales,
        landed.x,
        landed.y + offset,
        false,
    );

    // Guides come back in the parent's frame; the stage draws them in its own.
    publish(
        selection,
        alignment
            ? guides.map((guide) => offsetGuide(guide, alignment.frame))
            : guides,
    );
    context.announce?.(
        'stage-moved',
        locales.getLocale().language,
        describeMove(locales, guides, { ...landed, z: place.z }),
    );

    return true;
}
