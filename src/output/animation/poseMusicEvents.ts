/**
 * Pose music, on its way to the player.
 *
 * A parallel to {@link ../Cues/animations.ts} rather than a second listener on
 * it, for three reasons. The hosts differ: `EvaluationCues` is mounted only by
 * `ProjectView`, by design, while a pose's music is creator content that must
 * sound wherever output plays — the tutorial, the landing showcase, a shared
 * project — and `OutputView` is the one component all of those mount. The gates
 * differ: cues are off by default behind a per-device setting, and a viewer's
 * accessibility setting is not what decides whether a creator's music plays.
 * And `listeningForAnimations` is a cost gate that decides whether an
 * `AnimationEvent` is built at all; sharing the registry would make it
 * permanently true and charge every stage for cues nobody asked for.
 *
 * Deliberately free of `@db` and of Web Audio, and type-only in what it imports
 * from the animation layer, so nothing here closes a runtime import cycle.
 */

import type { OutputName } from '@output/animation/Animator';
import type { PoseStrike } from '@output/animation/poseMusic';

/** One animation's music, as it starts. */
export type PoseMusicEvent = {
    /** Whose animation this is: the key a cancel names. */
    name: OutputName;
    /** What it strikes, in time order, in ms from the start of the animation. */
    strikes: PoseStrike[];
};

type Listener = {
    started: (event: PoseMusicEvent) => void;
    stopped: (name: OutputName) => void;
};

/** Weak, since evaluators are replaced on every revision and must not be held
 * alive by a listener that outlived its view. */
const listeners = new WeakMap<object, Listener>();

/** Listen to one evaluator's pose music. Returns the unsubscribe. */
export function onPoseMusic(evaluator: object, listen: Listener): () => void {
    listeners.set(evaluator, listen);
    return () => {
        if (listeners.get(evaluator) === listen) listeners.delete(evaluator);
    };
}

/** An animation began (or resumed) and will strike these. */
export function reportPoseMusic(
    evaluator: object,
    event: PoseMusicEvent,
): void {
    listeners.get(evaluator)?.started(event);
}

/**
 * An animation ended, was cancelled, or was paused. Whatever it had *scheduled*
 * must not sound against a stage that is no longer doing it — but a piece
 * already sounding plays to its end, which is the music subsystem's own rule
 * everywhere else.
 */
export function cancelPoseMusic(evaluator: object, name: OutputName): void {
    listeners.get(evaluator)?.stopped(name);
}

/** Whether anything is listening, so the animation layer can skip converting
 * music no one will play. */
export function listeningForPoseMusic(evaluator: object): boolean {
    return listeners.has(evaluator);
}
