/**
 * What a snap sounds like (#117) — the sibling of `direction.ts`, whose
 * `describePlace` it reuses.
 *
 * Every string here carries BOTH what it lined up with and where it landed,
 * because a screen reader will not re-read a live region whose text hasn't
 * changed: a bare "left edge aligned" is the same words on every snap and would
 * be heard exactly once. The target's name and the coordinate are what differ
 * between two consecutive announcements. See `snapDescription.test.ts`.
 */

import type Locales from '@locale/Locales';
import { describePlace } from './direction';
import type { Anchor, Axis, Guide } from './snap';

/**
 * Which localized anchor word names each anchor. The order matches
 * `ui.output.snap.anchors`, and `XAnchors`/`YAnchors` in snap.ts — a positional
 * `[plain]` array, so all three must stay in step.
 */
const AnchorIndex: Record<Anchor, number> = {
    centerX: 0,
    left: 1,
    right: 2,
    centerY: 3,
    bottom: 4,
    top: 5,
    baseline: 6,
};

/** Which of the eight `ui.output.directions` an axis and sign name. */
const DirectionIndex = { x: { '-1': 6, '1': 2 }, y: { '-1': 4, '1': 0 } };

function anchorWord(locales: Locales, anchor: Anchor) {
    return locales.getPrimaryPlainText(
        (l) => l.ui.output.snap.anchors[AnchorIndex[anchor]],
    );
}

/** What one guide constrains, in words. */
export function describeGuide(locales: Locales, guide: Guide) {
    const anchor = anchorWord(locales, guide.anchor);
    return guide.target === undefined || guide.targetAnchor === undefined
        ? locales
              .concretize((l) => l.ui.output.snap.withGrid, { anchor })
              .toText()
        : locales
              .concretize((l) => l.ui.output.snap.withOutput, {
                  anchor,
                  target: guide.target,
                  targetAnchor: anchorWord(locales, guide.targetAnchor),
              })
              .toText();
}

/**
 * A completed move, as localized text: what it lined up with, and where it
 * landed. With nothing constraining it, this is just the destination — which
 * still varies, so a repeated arrow key stays audible.
 */
export default function describeMove(
    locales: Locales,
    guides: Guide[],
    place: { x: number; y: number; z: number },
) {
    const where = describePlace(locales, place);
    if (guides.length === 0) return where;
    return locales
        .concretize((l) => l.ui.output.snap.aligned, {
            constraints: guides
                .map((guide) => describeGuide(locales, guide))
                .join(', '),
            place: where,
        })
        .toText();
}

/** Said when a keyboard asked to jump to the next alignment and there is none
 *  that way. Constant by nature, so it goes out on the interrupt lane, which
 *  re-presents identical text. */
export function describeNoAlignment(
    locales: Locales,
    axis: Axis,
    direction: -1 | 1,
) {
    return locales
        .concretize((l) => l.ui.output.snap.none, {
            direction: locales.getPrimaryPlainText(
                (l) => l.ui.output.directions[DirectionIndex[axis][direction]],
            ),
        })
        .toText();
}
