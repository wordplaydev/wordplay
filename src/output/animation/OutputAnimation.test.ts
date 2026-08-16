import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import {
    isPlaceOnlyTween,
    sameAnimatingNodes,
} from '@output/animation/OutputAnimation';
import type Pose from '@output/animation/Pose';
import { toPose } from '@output/animation/Pose';
import Transition from '@output/animation/Transition';
import Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';
import { expect, test } from 'vitest';

/**
 * These two predicates decide whether OutputAnimation may retarget a running
 * Web Animation instead of cancelling and rebuilding it every frame. The
 * animation itself needs a DOM and vitest runs in node, so the decision is
 * factored out here where it can be tested directly.
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
