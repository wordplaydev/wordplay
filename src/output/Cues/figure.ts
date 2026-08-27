/**
 * What an animation sounds like: the pure mapping from a sequence of poses to a
 * figure of cues.
 *
 * Every value here comes from what the pose actually does — how far it turned,
 * where it moved, how big or how faint it became — so a hand-written
 * `Sequence({…})` is as specific as `Sequence.bounce()`, and so the *same*
 * sequence always produces the *same* figure. That determinism is the whole
 * point: a loop is heard as a phrase recurring rather than as noise recurring.
 *
 * Pure, and tested directly, for the reason `OutputAnimation.test.ts` gives for
 * its own predicates: the animation needs a DOM and vitest runs in node.
 */

import type { AnimationEvent } from '@output/Cues/animations';
import {
    Cues,
    FigureSpacingMs,
    MaxCuesPerFigure,
    MinimumCueMs,
    type AnimationCue,
} from '@output/Cues/cues';
import type Pose from '@output/animation/Pose';

/** One sounded moment of an animation. */
export type PoseCue = {
    /** When to sound it, in ms from the start of the animation. */
    atMs: number;
    event: AnimationCue;
    hz: number;
    /** −1 fully left, 1 fully right. */
    pan: number;
    gain: number;
    ms: number;
    /** How open the tone is, 0-1 — carries color, which nothing else does. */
    bright: number;
    /** A second pulse at this ratio; 1 means a single pulse. */
    bend: number;
    /** How big a change this was, 0-1. Only used to decide what to drop. */
    magnitude: number;
};

/** Rotation, in degrees, that bends the pitch as far as it goes. */
const FullTurn = 90;
/** Movement, in meters, that pans or bends as far as it goes. */
const FullReach = 0.5;
/** Below this, a change is too small to be worth a sound of its own. */
const MinMagnitude = 0.02;

function clamp(value: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, value));
}

/**
 * A stable voice per output: two things animating at once should be
 * distinguishable, and each should keep its pitch for as long as it lives.
 * FNV-1a, so the same name always lands on the same voice.
 */
export function baseHzOf(name: string): number {
    let hash = 2166136261;
    for (let index = 0; index < name.length; index++) {
        hash ^= name.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    // Spread over an octave and a half, scaled by an irrational-ish factor so
    // voices don't land on each other's harmonics or on the 12-TET grid — a cue
    // must never be mistaken for a note in the creator's own music.
    return Cues.pose.hz * (0.72 + ((hash >>> 0) / 0xffffffff) * 1.31);
}

/** What one pose changed, relative to the pose before it. */
type Change = {
    rotation: number;
    x: number;
    y: number;
    scale: number;
    opacity: number;
    /** 0-1, how far the color moved. */
    color: number;
    /** Where it now is, left to right, for panning. */
    at: number;
    /** How open the tone should be, from the color's own lightness. */
    bright: number;
    flipped: boolean;
};

function changeBetween(from: Pose | undefined, to: Pose): Change {
    const rotation = (to.rotation ?? 0) - (from?.rotation ?? 0);
    const x = (to.offset?.x ?? 0) - (from?.offset?.x ?? 0);
    const y = (to.offset?.y ?? 0) - (from?.offset?.y ?? 0);
    const scale = (to.scale ?? 1) - (from?.scale ?? 1);
    const opacity = to.opacity ?? 1;
    // Color is the only thing `rainbow` and `glow` change, so without it they
    // would animate in silence.
    const color =
        from?.color && to.color
            ? clamp(
                  Math.abs(
                      to.color.lightness.toNumber() -
                          from.color.lightness.toNumber(),
                  ) +
                      Math.abs(
                          to.color.chroma.toNumber() -
                              from.color.chroma.toNumber(),
                      ) /
                          100 +
                      Math.abs(
                          to.color.hue.toNumber() - from.color.hue.toNumber(),
                      ) /
                          360,
                  0,
                  1,
              )
            : 0;
    return {
        rotation,
        x,
        y,
        scale,
        opacity,
        color,
        at: to.offset?.x ?? 0,
        bright: to.color ? clamp(to.color.lightness.toNumber(), 0, 1) : 0.5,
        flipped:
            (to.flipx ?? false) !== (from?.flipx ?? false) ||
            (to.flipy ?? false) !== (from?.flipy ?? false),
    };
}

/** How much happened, 0-1, across every axis at once. */
function magnitudeOf(change: Change): number {
    return clamp(
        Math.abs(change.rotation) / FullTurn +
            Math.hypot(change.x, change.y) / FullReach +
            Math.abs(change.scale) +
            change.color +
            (change.flipped ? 0.5 : 0),
        0,
        1,
    );
}

/** The cue one pose arrival sounds, or nothing if it holds still. */
function cueFor(
    baseHz: number,
    change: Change,
    atMs: number,
): PoseCue | undefined {
    const magnitude = magnitudeOf(change);
    // Nothing changed means nothing is said — the rule the announcements follow.
    if (magnitude < MinMagnitude) return undefined;
    const spec = Cues.pose;
    return {
        atMs,
        event: 'pose',
        // Turning one way or moving up raises the pitch; growing lowers it,
        // because a bigger thing sounds bigger.
        hz:
            baseHz *
            (1 + clamp(change.rotation / FullTurn, -1, 1) * 0.35) *
            (1 + clamp(change.y / FullReach, -1, 1) * 0.3) *
            (1 - clamp(change.scale, -1, 1) * 0.25),
        // Where it *is*, not which way it went: a shimmy should be heard moving
        // from side to side.
        pan: clamp(change.at / FullReach, -1, 1),
        // A fading output fades out, so a `fadeout` ends in silence.
        gain: spec.gain * change.opacity * (0.4 + 0.6 * magnitude),
        ms: Math.max(MinimumCueMs, spec.ms * (1 + clamp(change.scale, 0, 1))),
        bright: change.bright,
        // A flip reverses rather than moves, so it chirps instead of ringing.
        bend: change.flipped ? 0.62 : 1,
        magnitude,
    };
}

/** The state's own cue, at the top of the animation, or nothing for a rest. */
function stateCue(event: AnimationEvent): PoseCue | undefined {
    if (event.state === 'rest' || event.state === 'done') return undefined;
    const spec = Cues[event.state];
    return {
        atMs: 0,
        event: event.state,
        hz: spec.hz,
        pan: 0,
        gain: spec.gain,
        ms: spec.ms,
        bright: 0.6,
        bend: spec.bend,
        // Always kept: a state change is the least frequent and most
        // informative thing an animation does.
        magnitude: 1,
    };
}

/** The figure this animation plays, in time order.
 *
 *  `repeat` adds the downbeat that makes a loop countable; the caller decides it
 *  by comparing {@link fingerprintOf} against what this output played last. */
export function figureFor(event: AnimationEvent, repeat = false): PoseCue[] {
    const baseHz = baseHzOf(event.name);
    const cues: PoseCue[] = [];

    const state = stateCue(event);
    if (state) cues.push(state);
    if (repeat)
        cues.push({
            atMs: 0,
            event: 'loop',
            hz: Cues.loop.hz,
            pan: 0,
            gain: Cues.loop.gain,
            ms: Cues.loop.ms,
            bright: 0.4,
            bend: 1,
            magnitude: 1,
        });

    // Transitions carry the time to *reach* each pose, so the clock advances
    // before the cue rather than after it.
    const factor =
        event.totalMs /
        Math.max(
            1,
            event.transitions.reduce(
                (total, transition) => total + transition.duration,
                0,
            ),
        );
    let atMs = 0;
    for (let index = 0; index < event.transitions.length; index++) {
        const transition = event.transitions[index];
        atMs += transition.duration * factor;
        // The first transition is where the animation starts, not somewhere it
        // arrives: `compile` gives it no duration, and `rest` prepends the pose
        // the output was already holding. Sounding it would announce the end of
        // the last loop at the start of the next one.
        if (index === 0) continue;
        if (atMs < event.fromMs) continue;
        const cue = cueFor(
            baseHz,
            changeBetween(event.transitions[index - 1]?.pose, transition.pose),
            atMs,
        );
        if (cue) cues.push(cue);
    }

    return thin(cues);
}

/**
 * Keep the figure to something hearable: the biggest changes, spaced far enough
 * apart to be separate events. Where two collide the smaller one loses, so what
 * survives is the shape of the motion rather than its first few milliseconds.
 */
export function thin(cues: PoseCue[]): PoseCue[] {
    const kept: PoseCue[] = [];
    for (const cue of [...cues].sort((a, b) => b.magnitude - a.magnitude)) {
        if (kept.length >= MaxCuesPerFigure) break;
        if (
            kept.some(
                (other) => Math.abs(other.atMs - cue.atMs) < FigureSpacingMs,
            )
        )
            continue;
        kept.push(cue);
    }
    return kept.sort((a, b) => a.atMs - b.atMs);
}

/** What makes two animations the same animation, for spotting a repeat. */
export function fingerprintOf(event: AnimationEvent): string {
    return [
        event.state,
        Math.round(event.totalMs),
        ...event.transitions.map((transition) =>
            transition.pose.value.toString(),
        ),
    ].join('|');
}
