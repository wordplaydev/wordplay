import {
    cancelAnimation,
    listeningForAnimations,
    onAnimations,
    reportAnimation,
    type AnimationEvent,
} from '@output/Cues/animations';
import { expect, test } from 'vitest';

/** Two stand-ins for evaluators, which the registry only uses as identities. */
const one = {};
const two = {};

function event(name: string): AnimationEvent {
    return { name, state: 'rest', transitions: [], totalMs: 1000, fromMs: 0 };
}

test('nothing is listening until something listens', () => {
    // The animation layer checks this before building an event at all, so a
    // stage no one is cueing pays nothing.
    expect(listeningForAnimations(one)).toBe(false);
    const stop = onAnimations(one, { started: () => {}, stopped: () => {} });
    expect(listeningForAnimations(one)).toBe(true);
    stop();
    expect(listeningForAnimations(one)).toBe(false);
});

test('an evaluator hears only its own animations', () => {
    const heard: string[] = [];
    const stop = onAnimations(one, {
        started: (e) => heard.push(e.name),
        stopped: () => {},
    });
    reportAnimation(one, event('mine'));
    // A docs page's previews are other evaluators, and must not cue a
    // creator's project.
    reportAnimation(two, event('theirs'));
    stop();
    expect(heard).toEqual(['mine']);
});

test('a cancel names what to take back', () => {
    const stopped: string[] = [];
    const stop = onAnimations(one, {
        started: () => {},
        stopped: (name) => stopped.push(name),
    });
    cancelAnimation(one, 'tree');
    stop();
    // And after unsubscribing, nothing more arrives.
    cancelAnimation(one, 'star');
    expect(stopped).toEqual(['tree']);
});
