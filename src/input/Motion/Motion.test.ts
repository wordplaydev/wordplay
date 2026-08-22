import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { OutputBody } from '@output/physics/Physics';
import { VelocityPxPerSecond } from '@output/physics/physicsCalibration';
import {
    getRapier,
    loadRapier,
    onRapierLoaded,
} from '@output/physics/rapierLoader';
import Evaluator from '@runtime/Evaluator';
import { beforeAll, expect, test } from 'vitest';
import Motion from './Motion';

beforeAll(async () => {
    loadRapier();
    await new Promise<void>((resolve) => onRapierLoaded(resolve));
});

/** A body in an empty, gravity-free world, standing in for one Physics would make. */
function makeBody() {
    const RAPIER = getRapier();
    return new OutputBody(
        new RAPIER.World({ x: 0, y: 0 }),
        'body',
        0,
        0,
        1,
        1,
        0,
        0,
        undefined,
        false,
        undefined,
    );
}

function evaluate(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluator.start();
    return evaluator;
}

test('a start velocity reaches a body created on the first sync', () => {
    const evaluator = evaluate(
        `Phrase('o' place: Motion(Place(0m 0m) Velocity(5m/s 0m/s)))`,
    );
    const motion = evaluator.getBasisStreamsOfType(Motion)[0];
    expect(motion).toBeDefined();

    const body = makeBody();
    motion.updateBody(body);
    expect(body.rigidBody.linvel().x).toBeCloseTo(5 * VelocityPxPerSecond);

    evaluator.stop();
});

test('a start velocity survives a re-evaluation that lands before any body exists', () => {
    const evaluator = evaluate(
        `Phrase('o' place: Motion(Place(0m 0m) Velocity(5m/s 0m/s)))`,
    );
    const motion = evaluator.getBasisStreamsOfType(Motion)[0];
    expect(motion).toBeDefined();

    // Physics.sync() bails out of the whole frame until Rapier's WASM loads, then
    // forces a fresh evaluation to break the deadlock — all before any body exists.
    // That re-evaluation must not discard the program's start velocity (#1231).
    evaluator.start();

    const body = makeBody();
    motion.updateBody(body);
    expect(body.rigidBody.linvel().x).toBeCloseTo(5 * VelocityPxPerSecond);

    evaluator.stop();
});
