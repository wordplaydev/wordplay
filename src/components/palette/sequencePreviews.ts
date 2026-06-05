import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Source from '@nodes/Source';
import { getDefaultSequences } from '@output/DefaultSequences';
import { styleToCSSEasing } from '@output/OutputAnimation';
import type Pose from '@output/Pose';
import Sequence, { createSequenceType, toSequence } from '@output/Sequence';
import Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';

/** A looping animation preview for a single sequence. */
export type SequencePreview = { keyframes: Keyframe[]; duration: number };

/** Meters are scaled down for previews so a sequence's offsets stay inside the tiny dot. */
const PREVIEW_PX_PER_METER = 16;

/**
 * Convert a single pose into a CSS transform for a preview. This intentionally uses only
 * the pose-local transform (scale, rotation, offset, flips) and skips the stage placement,
 * perspective, and bottom-origin math in `toOutputTransform`, which would push a tiny
 * preview out of its box.
 */
export function poseToPreviewTransform(pose: Pose): string {
    const scale = pose.scale ?? 1;
    const xScale = scale * (pose.flipx ? -1 : 1);
    const yScale = scale * (pose.flipy ? -1 : 1);
    const x = (pose.offset?.x ?? 0) * PREVIEW_PX_PER_METER;
    // Negate y so positive y is up, matching the stage convention.
    const y = -(pose.offset?.y ?? 0) * PREVIEW_PX_PER_METER;
    const rotation = pose.rotation ?? 0;
    return `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${xScale}, ${yScale})`;
}

function sequenceToPreview(
    sequence: Sequence,
    locales: Locales,
): SequencePreview {
    const easing = styleToCSSEasing(locales, sequence.style);
    const keyframes: Keyframe[] = sequence.poses.map((step) => {
        const pose = step.pose;
        const keyframe: Keyframe = {
            // `percent` is already a fraction (0–1): a 100% keyframe is 1, not 100.
            offset: Math.max(0, Math.min(1, step.percent)),
            transform: poseToPreviewTransform(pose),
            easing,
        };
        if (pose.opacity !== undefined) keyframe.opacity = pose.opacity;
        if (pose.color !== undefined) keyframe.color = pose.color.toCSS();
        return keyframe;
    });
    // Clamp to a perceptible minimum so a fast sequence (e.g. the default 0.25s) still
    // reads in the tiny preview, while longer durations are respected.
    return { keyframes, duration: Math.max(0.75, sequence.duration) * 1000 };
}

/** A stable key for the active locale set. */
function localeKey(locales: Locales): string {
    return locales
        .getLocales()
        .map((locale) => locale.language)
        .join('-');
}

/** Cache of custom-sequence previews keyed by locale + source, so the returned object is
 *  stable for unchanged source — otherwise rebuilding a new object on each re-render would
 *  restart (and visually freeze) the looping animation. */
const customCache = new Map<string, SequencePreview | undefined>();

/**
 * Build a preview for an arbitrary Sequence expression (e.g. a hand-written custom
 * sequence), by evaluating its Wordplay source. Returns undefined if it doesn't evaluate
 * to a Sequence (e.g. it references program state that isn't available in isolation).
 * Memoized by source so repeated calls return the same object.
 */
export function buildSequencePreview(
    locales: Locales,
    sequenceSource: string,
): SequencePreview | undefined {
    const key = `${localeKey(locales)}\n${sequenceSource}`;
    const cached = customCache.get(key);
    if (cached !== undefined || customCache.has(key)) return cached;

    let result: SequencePreview | undefined;
    try {
        const source = new Source('sequence-preview', sequenceSource);
        const project = Project.make(
            null,
            'sequence-preview',
            source,
            [],
            locales.getLocales(),
        );
        const evaluator = new Evaluator(project, DB, locales.getLocales());
        const value = evaluator.getInitialValue();
        evaluator.stop();
        const sequence = toSequence(project, value);
        result = sequence ? sequenceToPreview(sequence, locales) : undefined;
    } catch {
        result = undefined;
    }
    customCache.set(key, result);
    return result;
}

function computePreviews(locales: Locales): Map<string, SequencePreview> {
    const previews = new Map<string, SequencePreview>();

    const entries = Object.entries(getDefaultSequences(locales));
    const sequenceName = locales.getName(createSequenceType(locales).names);

    // Evaluate all default sequences at once, calling each with its default arguments.
    const source = new Source(
        'sequence-previews',
        `[${entries
            .map(
                ([, def]) =>
                    `${sequenceName}(${locales.getName(def.names)}() 1s)`,
            )
            .join(' ')}]`,
    );
    const project = Project.make(
        null,
        'sequence-previews',
        source,
        [],
        locales.getLocales(),
    );
    const value = new Evaluator(
        project,
        DB,
        locales.getLocales(),
    ).getInitialValue();

    if (value instanceof ListValue) {
        entries.forEach(([key], index) => {
            const sequence = toSequence(project, value.values[index]);
            if (sequence !== undefined)
                previews.set(key, sequenceToPreview(sequence, locales));
        });
    }

    return previews;
}

/** Cache of previews per locale set, so the evaluation only happens once. */
const cache = new Map<string, Map<string, SequencePreview>>();

/**
 * Get a map from each default sequence's key to a looping preview animation. Memoized by
 * the active locale set, so the (single) evaluation runs only the first time per language.
 */
export default function getSequencePreviews(
    locales: Locales,
): Map<string, SequencePreview> {
    const key = localeKey(locales);
    const cached = cache.get(key);
    if (cached) return cached;
    const previews = computePreviews(locales);
    cache.set(key, previews);
    return previews;
}
