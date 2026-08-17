import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { getPlacingMotion } from '@input/Motion/Motion';
import {
    isPlaceOnlyTween,
    sameAnimatingNodes,
} from '@output/animation/OutputAnimation';
import type Output from '@output/Output/Output';
import type Stage from '@output/Output/Stage';
import { toStage } from '@output/Output/Stage';
import type Pose from '@output/animation/Pose';
import { toPose } from '@output/animation/Pose';
import Transition from '@output/animation/Transition';
import Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';
import { expect, test } from 'vitest';

/**
 * These predicates decide whether OutputAnimation may retarget the running Web
 * Animation instead of cancelling and rebuilding it every frame, and which
 * bodies the simulation places — which is what exempts a simulated body's
 * default pose from being tweened every frame, and what makes it dynamic rather
 * than kinematic. The animation itself needs a DOM and vitest runs in node, so
 * the decisions are factored out here to be tested directly.
 */

/** Build real Pose values from a Wordplay list literal, so each carries its own
 *  creator node — which is what Animator tracks animating output by. */
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

/** Transitions carrying the given poses. Places are irrelevant here — that's
 *  the point of the predicate, which only inspects poses. */
function tween(given: Pose[]): Transition[] {
    return given.map(
        (pose) => new Transition(undefined, 1, pose, 0.125, undefined),
    );
}

test('a tween whose poses are all equal moves the output without posing it', () => {
    // Three separate Pose values, equal by content but distinct objects — the
    // shape move() builds for output with no resting: or moving: pose.
    const same = poses(
        '[Pose(rotation: 15°) Pose(rotation: 15°) Pose(rotation: 15°)]',
    );
    expect(isPlaceOnlyTween(tween(same))).toBe(true);
});

test('a tween that ends on a different pose is not place-only', () => {
    // What an authored `moving:` pose produces: the move pose on the way, then
    // back to rest. Retargeting this would let it sweep back to the resting
    // pose every duration instead of holding, so it must keep restarting.
    const posed = poses(
        '[Pose(rotation: 15°) Pose(rotation: 15°) Pose(rotation: 0°)]',
    );
    expect(isPlaceOnlyTween(tween(posed))).toBe(false);
});

test('a spinning body is still place-only, since its keyframes agree', () => {
    // A body whose rotation changes every frame lands the same rotation on all
    // of its keyframes, so it stays retargetable — comparing across frames
    // rather than within a tween would wrongly disqualify it.
    const first = tween(
        poses('[Pose(rotation: 3°) Pose(rotation: 3°) Pose(rotation: 3°)]'),
    );
    const next = tween(
        poses('[Pose(rotation: 9°) Pose(rotation: 9°) Pose(rotation: 9°)]'),
    );
    expect(isPlaceOnlyTween(first)).toBe(true);
    expect(isPlaceOnlyTween(next)).toBe(true);
});

test('a tween repeated from the same poses animates the same nodes', () => {
    const repeated = poses('[Pose(rotation: 0°) Pose(rotation: 0°)]');
    expect(sameAnimatingNodes(tween(repeated), tween(repeated))).toBe(true);
});

test('poses written at different places in the source animate different nodes', () => {
    const all = poses(
        '[Pose(rotation: 0°) Pose(rotation: 0°) Pose(rotation: 0°) Pose(rotation: 0°)]',
    );
    const before = all.slice(0, 2);
    const after = all.slice(2, 4);
    // Equal by value, but written at different places in the source, so the
    // editor highlights different nodes and the change must be published.
    expect(before[0].equals(after[0])).toBe(true);
    expect(sameAnimatingNodes(tween(before), tween(after))).toBe(false);
});

test('tweens of different lengths animate different nodes', () => {
    const three = poses(
        '[Pose(rotation: 0°) Pose(rotation: 0°) Pose(rotation: 0°)]',
    );
    expect(sameAnimatingNodes(tween(three), tween(three.slice(0, 2)))).toBe(
        false,
    );
});

/** The stage a program renders, with its evaluator still live so stream
 *  resolution can be queried the way the animator does. */
function stageOf(code: string) {
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
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    return { stage, evaluator };
}

function named(stage: Stage, name: string): Output {
    const output = stage.content.find((out) => out?.getName() === name);
    if (!output) throw new Error(`expected output named ${name}`);
    return output;
}

test('physics computes the place of output placed by Motion', () => {
    const { stage, evaluator } = stageOf(
        `Stage([Phrase('a' name: 'flying' place: Motion(Place(0m 0m) Velocity(1m/s 0m/s)) matter: Matter())])`,
    );
    expect(
        getPlacingMotion(evaluator, named(stage, 'flying')) !== undefined,
    ).toBe(true);
    evaluator.stop();
});

test('the program keeps the place of output that only has matter', () => {
    // FootBall's keeper and Pears' Placement-driven girl are this shape: they
    // are in the physics world for collisions, but the program moves them in
    // discrete jumps, so their movement is still worth tweening.
    const { stage, evaluator } = stageOf(
        `Stage([Phrase('b' name: 'keeper' place: Place(1m 2m) matter: Matter())])`,
    );
    expect(
        getPlacingMotion(evaluator, named(stage, 'keeper')) !== undefined,
    ).toBe(false);
    evaluator.stop();
});

test('output with no place at all is not simulated', () => {
    const { stage, evaluator } = stageOf(`Stage([Phrase('c' name: 'still')])`);
    expect(
        getPlacingMotion(evaluator, named(stage, 'still')) !== undefined,
    ).toBe(false);
    evaluator.stop();
});
