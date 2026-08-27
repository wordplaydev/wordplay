/**
 * Animations, on their way to becoming sound.
 *
 * The other cue sources are all events that re-enter the evaluator — a stream
 * reaction, a physics contact. An animation is neither: a resting `Sequence`
 * drives one long-lived Web Animation and never touches the program again, so a
 * stage like the Christmas tree, whose whole behavior is a looping sequence,
 * had nothing for any cue to name.
 *
 * Deliberately free of `@db` and of Web Audio, and type-only in what it imports
 * from the animation layer, so nothing here closes a runtime import cycle with
 * `OutputAnimation`.
 */

import type { OutputName } from '@output/animation/Animator';
import type { AnimationState } from '@output/animation/OutputAnimation';
import type Transition from '@output/animation/Transition';

/** One animation, as it starts. */
export type AnimationEvent = {
    /** Whose animation this is: a stable voice, and the key a cancel names. */
    name: OutputName;
    state: AnimationState;
    /** The poses in order, each with the seconds it takes to reach. */
    transitions: Transition[];
    /** The whole animation's length, with the animation factor already in it. */
    totalMs: number;
    /** Where in the animation to begin sounding. Nonzero only when resuming
     *  from a pause, where the earlier poses have already gone by. */
    fromMs: number;
};

type Listener = {
    started: (event: AnimationEvent) => void;
    stopped: (name: OutputName) => void;
};

/** Weak, since evaluators are replaced on every revision and must not be held
 * alive by a listener that outlived its view. */
const listeners = new WeakMap<object, Listener>();

/** Listen to one evaluator's animations. Returns the unsubscribe. */
export function onAnimations(evaluator: object, listen: Listener): () => void {
    listeners.set(evaluator, listen);
    return () => {
        if (listeners.get(evaluator) === listen) listeners.delete(evaluator);
    };
}

/** An animation began (or resumed). */
export function reportAnimation(
    evaluator: object,
    event: AnimationEvent,
): void {
    listeners.get(evaluator)?.started(event);
}

/** An animation ended, was cancelled, or was paused. Whatever it had scheduled
 * ahead must not go on sounding against a stage that is no longer doing it. */
export function cancelAnimation(evaluator: object, name: OutputName): void {
    listeners.get(evaluator)?.stopped(name);
}

/** Whether anything is listening, so the animation layer can skip building an
 * event no one will hear. */
export function listeningForAnimations(evaluator: object): boolean {
    return listeners.has(evaluator);
}
