import type * as RAPIER from '@dimforge/rapier2d-compat';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { DefaultGravity } from '@output/Output/Stage';
import type Matter from '@output/physics/Matter';
import { toMatter } from '@output/physics/Matter';
import {
    FIXED_STEP_MS,
    GravityPxPerS2PerUnit,
    OutputBody,
} from '@output/physics/Physics';
import Evaluator from '@runtime/Evaluator';
import { getRapier, loadRapier, onRapierLoaded } from './rapierLoader';
import { beforeAll, expect, test } from 'vitest';

/**
 * Characterizes the engine behaviors our Matter.js-emulating calibration
 * depends on, so an engine upgrade shows up as a failing number instead of a
 * project that "feels wrong". The measured values in each comment came from
 * @dimforge/rapier2d-compat 0.19.3; assertions are deliberately behavioral
 * claims with tolerances, not float snapshots, so they survive a bump that
 * doesn't actually change the feel.
 */

beforeAll(async () => {
    loadRapier();
    await new Promise<void>((resolve) => onRapierLoaded(resolve));
});

/** A world configured exactly as Physics.getWorldAtZ does. */
function makeWorld(gravity = DefaultGravity) {
    const RAPIER = getRapier();
    const world = new RAPIER.World({ x: 0, y: 0 });
    world.timestep = FIXED_STEP_MS / 1000;
    world.lengthUnit = PX_PER_METER;
    // Engine y is negated stage y, so positive gravity is downward on screen.
    world.gravity.y = gravity * GravityPxPerS2PerUnit;
    return world;
}

/** A fixed floor whose top surface sits at engine y = 0, built the way
 *  Physics.createBarrierBody builds barriers. */
function addFloor(world: RAPIER.World) {
    const RAPIER = getRapier();
    const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(0, 10).setRotation(0),
    );
    return world.createCollider(
        RAPIER.ColliderDesc.cuboid(1000, 10)
            .setFriction(0.1)
            .setRestitution(0)
            .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
            .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
        body,
    );
}

/** A 1m × 1m body dropped from `height` meters above the floor. Its collider is
 *  a plain cuboid with 32px half-extents, so it rests with its center at
 *  engine y = -32. */
function drop(world: RAPIER.World, height: number, matter?: Matter) {
    return new OutputBody(
        world,
        'body',
        -0.5,
        height,
        1,
        1,
        0,
        0,
        matter,
        undefined,
    );
}

/** Build a real Matter through the same conversion the runtime uses, so the
 *  collider gets the restitution a project would actually give it. */
function matter(bounciness: number): Matter {
    const source = new Source('test', `Matter(bounciness: ${bounciness})`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluator.start();
    const value = toMatter(evaluator.getLatestSourceValue(source));
    evaluator.stop();
    if (value === undefined) throw new Error('expected a Matter value');
    return value;
}

/** Step until the body stops moving, returning where and when it came to rest. */
function settle(world: RAPIER.World, body: OutputBody, maxSteps = 900) {
    let restingSteps = 0;
    let peakAfterFirstContact: number | undefined;
    let touched = false;
    for (let step = 1; step <= maxSteps; step++) {
        world.step();
        const y = body.rigidBody.translation().y;
        // Rising again (y decreasing) after the first contact means a bounce.
        if (!touched && y > -40) touched = true;
        if (touched)
            peakAfterFirstContact = Math.min(peakAfterFirstContact ?? y, y);
        const v = body.rigidBody.linvel();
        if (Math.hypot(v.x, v.y) < 1) {
            restingSteps++;
            if (restingSteps >= 10)
                return { y, steps: step, peak: peakAfterFirstContact };
        } else restingSteps = 0;
    }
    return {
        y: body.rigidBody.translation().y,
        steps: maxSteps,
        peak: peakAfterFirstContact,
    };
}

test('a dropped body falls, lands on a barrier, and comes to rest on it', () => {
    const world = makeWorld();
    addFloor(world);
    // Center starts at engine y = -320, i.e. 288px above its resting center.
    const body = drop(world, 4.5, matter(0));
    expect(body.rigidBody.translation().y).toBeCloseTo(-320);

    const rest = settle(world, body);

    // Rests with its 32px half-height on the floor top at y = 0, sunk by
    // whatever penetration the solver allows; the gap is set by the engine's
    // contact tolerances, which scale with world.lengthUnit.
    // 0.19.3: y = -30.22, settled in 36 steps.
    expect(rest.y).toBeGreaterThan(-33);
    expect(rest.y).toBeLessThan(-28);
    expect(rest.steps).toBeLessThan(120);
    // With no bounciness it never rises after contact. 0.19.3: peak = -33.6.
    expect(rest.peak ?? 0).toBeGreaterThan(-40);
});

test('output with no matter passes through barriers', () => {
    const world = makeWorld();
    addFloor(world);
    // No Matter means an empty collision filter: Placement-driven output falls
    // through everything, which is what lets projects place text freely.
    const body = drop(world, 4.5);

    for (let step = 0; step < 120; step++) world.step();

    expect(body.rigidBody.translation().y).toBeGreaterThan(100);
});

test('a bouncy body rebounds off a barrier that has no bounce of its own', () => {
    const world = makeWorld();
    addFloor(world);
    const body = drop(world, 4.5, matter(0.8));

    const rest = settle(world, body);

    // The barrier's restitution is 0, so a rebound at all proves the Max
    // combine rule is in force; Rapier's default would average it to 0.4.
    // 0.19.3: peak = -175.6, a 145px rebound off a 288px drop.
    expect(rest.peak).toBeDefined();
    expect(rest.peak ?? 0).toBeLessThan(-80);
    // It comes back down near rest rather than bouncing away (AirDamping).
    // 0.19.3: y = -32.6 after 900 steps, still micro-bouncing.
    expect(rest.y).toBeGreaterThan(-35);
    expect(rest.y).toBeLessThan(-28);
});

test('landing on a barrier reports collision starts and stops', () => {
    const RAPIER = getRapier();
    const world = makeWorld();
    addFloor(world);
    const body = drop(world, 4.5, matter(0.8));
    const events = new RAPIER.EventQueue(true);

    let started = 0;
    let stopped = 0;
    for (let step = 0; step < 900; step++) {
        world.step(events);
        events.drainCollisionEvents((_h1, _h2, begin) => {
            if (begin) started++;
            else stopped++;
        });
    }

    // It lands, bounces off (ending that contact), and lands again. A bouncy
    // body chatters against the floor for a long time, so 0.19.3 reports 192
    // starts and 191 stops over these 900 steps; only the shape is asserted.
    expect(started).toBeGreaterThanOrEqual(2);
    expect(stopped).toBeGreaterThanOrEqual(1);
    expect(body.rigidBody.translation().y).toBeGreaterThan(-33);
});

test('a kinematic sensor swept through a barrier still reports a collision', () => {
    const RAPIER = getRapier();
    const world = makeWorld(0);
    addFloor(world);
    // Placement-driven output: kinematic and a sensor, as Physics.sync makes it.
    const body = drop(world, 4.5, matter(0));
    body.rigidBody.setBodyType(
        RAPIER.RigidBodyType.KinematicPositionBased,
        true,
    );
    body.collider.setSensor(true);
    const events = new RAPIER.EventQueue(true);

    let started = 0;
    // Sweep it down through the floor the way Physics.tick interpolates.
    for (let step = 1; step <= 40; step++) {
        body.rigidBody.setNextKinematicTranslation({
            x: 0,
            y: -320 + step * 8,
        });
        world.step(events);
        events.drainCollisionEvents((_h1, _h2, begin) => {
            if (begin) started++;
        });
    }

    expect(started).toBeGreaterThanOrEqual(1);
});

test('angular velocity survives a step at the rates projects actually use', () => {
    const world = makeWorld(0);
    // Questions.wp spins output at up to 30°/s, and Motion scales by 60.
    const body = drop(world, 4.5, matter(0));
    const spin = ((30 * Math.PI) / 180) * 60;
    body.rigidBody.setAngvel(spin, true);
    world.step();

    // Only AirDamping should touch it: e^(-0.6 × 0.016) ≈ 0.9904. Rapier 0.35
    // caps rotation at ~45°/step (~49 rad/s); this rate is ~31.4 rad/s and
    // clears it, so anything near a halving means the cap has started biting.
    expect(body.rigidBody.angvel() / spin).toBeGreaterThan(0.98);
    expect(body.rigidBody.angvel() / spin).toBeLessThanOrEqual(1);
});
