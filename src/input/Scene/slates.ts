import type Evaluator from '@runtime/Evaluator';
import type StreamValue from '@values/StreamValue';
import type { SlateState } from './Slate';

/**
 * What a scene reports its position to.
 *
 * A spotlight can't simply read its scene when it is asked for, because a spotlight is not
 * downstream of the scene it follows: granular reevaluation keeps its cached
 * value precisely because nothing it depends on changed, so it would never be
 * asked again. It has to be pushed to, and it has to be in the set of streams a
 * cut evaluates, so that whatever the creator drew from it is redrawn.
 *
 * The registry is what lets that happen without `Scene` and `Spotlight` importing each
 * other: a spotlight says it is listening, and a scene reports without knowing what a
 * spotlight is.
 */
export type SlateListener = StreamValue & {
    /** Whether this listener follows the scene with the given name. */
    hears(scene: string): boolean;
    /** Take a position. False when it is the one already held. */
    take(state: SlateState): boolean;
};

/** Keyed weakly, so a listener can't hold a finished evaluator's streams alive.
 * An evaluator is rebuilt on every edit, and its streams are rebuilt with it. */
const listeners = new WeakMap<Evaluator, Set<SlateListener>>();

export function listenForSlates(evaluator: Evaluator, listener: SlateListener) {
    const existing = listeners.get(evaluator);
    if (existing === undefined) listeners.set(evaluator, new Set([listener]));
    else existing.add(listener);
}

export function stopListeningForSlates(
    evaluator: Evaluator,
    listener: SlateListener,
) {
    listeners.get(evaluator)?.delete(listener);
}

/** Tell every listener following this scene where it is, and answer with the
 * ones that hadn't already been told. */
export function reportSlate(
    evaluator: Evaluator,
    state: SlateState,
): SlateListener[] {
    const heard: SlateListener[] = [];
    for (const listener of listeners.get(evaluator) ?? [])
        if (listener.hears(state.scene) && listener.take(state))
            heard.push(listener);
    return heard;
}
