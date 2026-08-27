import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import type { AnimationEvent } from '@output/Cues/animations';
import { Cues, FigureSpacingMs, MaxCuesPerFigure } from '@output/Cues/cues';
import { baseHzOf, figureFor, fingerprintOf, thin } from '@output/Cues/figure';
import type Pose from '@output/animation/Pose';
import { toPose } from '@output/animation/Pose';
import Transition from '@output/animation/Transition';
import Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';
import { describe, expect, test } from 'vitest';

/**
 * Animation was the one thing a stage does that made no sound: a resting
 * `Sequence` drives a Web Animation and never re-enters the evaluator, so the
 * Christmas tree's whole behavior was inaudible. What it sounds like is decided
 * here, from what each pose actually does — and the mapping is deliberately
 * deterministic, since that is what makes a loop heard as a phrase recurring.
 *
 * Real `Pose` values, built through a real evaluator, the way
 * `OutputAnimation.test.ts` builds its own — the animation needs a DOM, the
 * decision doesn't.
 */

/** Build real Poses from a Wordplay list literal. */
function poses(code: string): Pose[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const evaluator = new Evaluator(
        project,
        DB,
        DefaultLocales.getLocales(),
        false,
    );
    const value = evaluator.getInitialValue();
    evaluator.stop();
    if (!(value instanceof ListValue))
        throw new Error('expected a list of poses');
    return value.values.map((item) => {
        const pose = toPose(project, item);
        if (pose === undefined) throw new Error('expected a pose');
        return pose;
    });
}

/** An animation of the given poses, one second apart. */
function animation(code: string, state: AnimationEvent['state'] = 'rest') {
    const list = poses(code);
    return {
        name: 'tree',
        state,
        transitions: list.map(
            (pose) => new Transition(undefined, 1, pose, 1, undefined),
        ),
        totalMs: list.length * 1000,
        fromMs: 0,
    };
}

describe('what a pose sounds like', () => {
    test('turning one way and the other moves the pitch both ways', () => {
        // The Christmas tree's rock: 0° → 15° → 0°.
        const figure = figureFor(
            animation(`[🤪(rotation: 0°) 🤪(rotation: 15°) 🤪(rotation: 0°)]`),
        );
        expect(figure).toHaveLength(2);
        const base = baseHzOf('tree');
        expect(figure[0].hz).toBeGreaterThan(base);
        expect(figure[1].hz).toBeLessThan(base);
    });

    test('moving side to side pans side to side', () => {
        // The tree's shimmy: −0.25m → +0.25m → −0.25m.
        const figure = figureFor(
            animation(`[
                🤪(offset: 📍(-0.25m))
                🤪(offset: 📍(0.25m))
                🤪(offset: 📍(-0.25m))
            ]`),
        );
        expect(figure).toHaveLength(2);
        // Where it is, not which way it went, so a shimmy is heard moving.
        expect(figure[0].pan).toBeGreaterThan(0);
        expect(figure[1].pan).toBeLessThan(0);
    });

    test('a fading output fades out', () => {
        const figure = figureFor(
            animation(`[🤪(opacity: 100%) 🤪(opacity: 10% rotation: 20°)]`),
        );
        expect(figure).toHaveLength(1);
        // Gain follows opacity, so a fadeout ends in near-silence rather than
        // announcing its own disappearance at full volume.
        expect(figure[0].gain).toBeLessThan(Cues.pose.gain * 0.5);
    });

    test('growing sounds bigger: lower and longer', () => {
        const [small] = figureFor(animation(`[🤪(scale: 1) 🤪(scale: 2)]`));
        const [large] = figureFor(animation(`[🤪(scale: 1) 🤪(scale: 1.1)]`));
        expect(small.hz).toBeLessThan(large.hz);
        expect(small.ms).toBeGreaterThan(large.ms);
    });

    test('a pose that changes nothing says nothing', () => {
        // Silence is the signal for no change, as everywhere else.
        expect(
            figureFor(animation(`[🤪(rotation: 5°) 🤪(rotation: 5°)]`)),
        ).toHaveLength(0);
    });

    test('a color change is audible, since some animations change only color', () => {
        expect(
            figureFor(
                animation(
                    `[🤪(color: 🌈(50% 100 0°)) 🤪(color: 🌈(50% 100 180°))]`,
                ),
            ).length,
        ).toBeGreaterThan(0);
    });

    test('two outputs sound like two outputs', () => {
        expect(baseHzOf('tree')).not.toBe(baseHzOf('star'));
    });
});

describe('what a whole animation sounds like', () => {
    test('the same sequence always plays the same figure', () => {
        // The invariant the feature rests on: a loop is heard as a phrase
        // recurring. A mapping that varied would be noise recurring.
        const code = `[🤪(rotation: 0°) 🤪(rotation: 15°) 🤪(offset: 📍(0.25m))]`;
        expect(figureFor(animation(code))).toEqual(figureFor(animation(code)));
    });

    test('coming round again is marked, the first time round is not', () => {
        const event = animation(`[🤪(rotation: 0°) 🤪(rotation: 15°)]`);
        expect(figureFor(event, false).some((c) => c.event === 'loop')).toBe(
            false,
        );
        expect(figureFor(event, true).some((c) => c.event === 'loop')).toBe(
            true,
        );
    });

    test('entering and exiting say so; resting just plays', () => {
        const code = `[🤪(rotation: 0°) 🤪(rotation: 15°)]`;
        expect(
            figureFor(animation(code, 'entering')).some(
                (c) => c.event === 'entering',
            ),
        ).toBe(true);
        expect(
            figureFor(animation(code, 'exiting')).some(
                (c) => c.event === 'exiting',
            ),
        ).toBe(true);
        expect(
            figureFor(animation(code, 'rest')).every((c) => c.event === 'pose'),
        ).toBe(true);
    });

    test('resuming from a pause skips the poses already gone by', () => {
        const event = {
            ...animation(
                `[🤪(rotation: 0°) 🤪(rotation: 15°) 🤪(rotation: 0°)]`,
            ),
            fromMs: 2500,
        };
        // Only the last pose is still ahead of where the animation is.
        expect(figureFor(event)).toHaveLength(1);
    });

    test('a fingerprint tells one animation from another', () => {
        const rock = animation(`[🤪(rotation: 0°) 🤪(rotation: 15°)]`);
        const shimmy = animation(
            `[🤪(offset: 📍(-0.25m)) 🤪(offset: 📍(0.25m))]`,
        );
        expect(fingerprintOf(rock)).toBe(fingerprintOf(rock));
        expect(fingerprintOf(rock)).not.toBe(fingerprintOf(shimmy));
    });
});

describe('keeping a figure hearable', () => {
    /** Cues at the given times, all of the same size. */
    function at(...times: number[]) {
        return times.map((atMs) => ({
            atMs,
            event: 'pose' as const,
            hz: 400,
            pan: 0,
            gain: 0.1,
            ms: 40,
            bright: 0.5,
            bend: 1,
            magnitude: 0.5,
        }));
    }

    test('a figure is a phrase, not a scale', () => {
        const many = at(
            ...Array.from({ length: 40 }, (_, index) => index * 200),
        );
        expect(thin(many)).toHaveLength(MaxCuesPerFigure);
    });

    test('where two collide the smaller change loses', () => {
        const [first, second] = at(0, FigureSpacingMs / 2);
        const kept = thin([
            { ...first, magnitude: 0.2 },
            { ...second, magnitude: 0.9 },
        ]);
        expect(kept).toHaveLength(1);
        expect(kept[0].magnitude).toBe(0.9);
    });

    test('what survives stays in time order', () => {
        const kept = thin(at(600, 0, 300));
        expect(kept.map((cue) => cue.atMs)).toEqual([0, 300, 600]);
    });
});
