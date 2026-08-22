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
 * @dimforge/rapier2d-compat 0.20.0, with the 0.19.3 numbers alongside where
 * they differ; assertions are deliberately behavioral claims with tolerances,
 * not float snapshots, so they survive a bump that doesn't change the feel.
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
function drop(
    world: RAPIER.World,
    height: number,
    matter?: Matter,
    detectable = false,
) {
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
        detectable,
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
    // 0.20.0: y = -31.99 in 36 steps (0.19.3 sank to -30.22 in the same 36).
    expect(rest.y).toBeGreaterThan(-33);
    expect(rest.y).toBeLessThan(-28);
    expect(rest.steps).toBeLessThan(120);
    // With no bounciness it never rises after contact. Both: peak = -33.6.
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
    // 0.20.0: peak = -176.2, a 144px rebound off a 288px drop (0.19.3: -175.6,
    // so bounce height is the one thing the engine upgrade left alone).
    expect(rest.peak).toBeDefined();
    expect(rest.peak ?? 0).toBeLessThan(-80);
    // It comes back down to rest rather than bouncing away (AirDamping).
    // 0.20.0: y = -32.04, settled in 156 steps; 0.19.3 was still
    // micro-bouncing at -32.55 when the 900-step budget ran out.
    expect(rest.y).toBeGreaterThan(-35);
    expect(rest.y).toBeLessThan(-28);
    expect(rest.steps).toBeLessThan(400);
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

    // It lands, bounces off (ending that contact), and lands again. How many
    // times is the Collision stream's firing rate, and it is engine-sensitive:
    // 0.20.0 reports 7 starts / 6 stops here where 0.19.3 chattered out
    // 192 / 191, so only the shape is asserted.
    expect(started).toBeGreaterThanOrEqual(2);
    expect(started).toBeLessThan(50);
    expect(stopped).toBeGreaterThanOrEqual(1);
    expect(body.rigidBody.translation().y).toBeGreaterThan(-33);
});

test('a settled body sleeps, and only a wake-up lets gravity reach it', () => {
    const world = makeWorld();
    addFloor(world);
    const body = drop(world, 4.5, matter(0));
    settle(world, body);
    // 0.20.0 sleeps a settled body after ~0.37s; 0.19.3 took ~2s.
    for (let step = 0; step < 200; step++) world.step();
    expect(body.rigidBody.isSleeping()).toBe(true);

    // Flipping gravity the way a stage does moves a sleeping body not at all,
    // because Rapier's integrator skips sleeping islands. Physics.sync does
    // not wake bodies on a gravity change, so this is a real hazard for a
    // stage that flips gravity — but not one that bites today: everything
    // sync touches per frame already passes wakeUp, which is why Hira.wp
    // still responds. Verified in the browser both with and without an
    // explicit wake. If a stage ever does sleep through a gravity change,
    // this test says where to look.
    const settled = body.rigidBody.translation().y;
    world.gravity.y = -DefaultGravity * GravityPxPerS2PerUnit;
    for (let step = 0; step < 120; step++) world.step();
    expect(body.rigidBody.translation().y).toBeCloseTo(settled);

    // Awake, the same gravity lifts it off the barrier.
    body.rigidBody.wakeUp();
    for (let step = 0; step < 120; step++) world.step();
    expect(body.rigidBody.translation().y).toBeLessThan(settled - 100);
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

/**
 * The rest of this file characterizes what Matter does. These four cover what a
 * *name* does: a Collision watching a name is enough to put an output in the
 * physical world, so two named phrases notice each other with no Matter at all
 * (#548). Such a body is always a sensor, so joining the world can report a
 * contact without changing how anything moves.
 */

/** A body at rest at engine y = 0, positioned to overlap a body dropped onto
 *  it, built the way Physics builds one for an output nothing places. */
function watchedSensor(world: RAPIER.World, detectable = true) {
    const RAPIER = getRapier();
    const body = drop(world, 0, undefined, detectable);
    body.rigidBody.setBodyType(
        RAPIER.RigidBodyType.KinematicPositionBased,
        true,
    );
    body.collider.setSensor(true);
    return body;
}

test('a body with no matter collides when something is watching its name', () => {
    const RAPIER = getRapier();
    const world = makeWorld();
    // Neither body has Matter. Both are watched, so both get the full filter.
    watchedSensor(world);
    const falling = drop(world, 4.5, undefined, true);
    falling.collider.setSensor(true);
    const events = new RAPIER.EventQueue(true);

    let started = 0;
    for (let step = 0; step < 300; step++) {
        world.step(events);
        events.drainCollisionEvents((_h1, _h2, begin) => {
            if (begin) started++;
        });
    }

    // It falls onto the resting body and reports the touch. Without the watch
    // both filters would be empty and this would be 0, which is #548.
    expect(started).toBeGreaterThanOrEqual(1);
    // And it passes straight through: detectable is not solid.
    expect(falling.rigidBody.translation().y).toBeGreaterThan(100);
});

test('a body nothing is watching reports no collision at all', () => {
    const RAPIER = getRapier();
    const world = makeWorld();
    // The same pair, with nothing watching either name: empty filters, silence.
    watchedSensor(world, false);
    const falling = drop(world, 4.5, undefined, false);
    falling.collider.setSensor(true);
    const events = new RAPIER.EventQueue(true);

    let started = 0;
    for (let step = 0; step < 300; step++) {
        world.step(events);
        events.drainCollisionEvents((_h1, _h2, begin) => {
            if (begin) started++;
        });
    }

    expect(started).toBe(0);
});

test('making a matterless motion body a sensor does not change how it falls', () => {
    // Physics now makes any body without Matter a sensor, including a
    // Motion-driven one that used to be solid with an empty filter. That was
    // already contacting nothing, so the fall must be identical — if Rapier
    // dropped a sensor collider's mass contribution, it would not be.
    const solidWorld = makeWorld();
    const solid = drop(solidWorld, 4.5);

    const sensorWorld = makeWorld();
    const sensor = drop(sensorWorld, 4.5);
    sensor.collider.setSensor(true);

    for (let step = 0; step < 120; step++) {
        solidWorld.step();
        sensorWorld.step();
    }

    expect(sensor.rigidBody.translation().y).toBeCloseTo(
        solid.rigidBody.translation().y,
        6,
    );
});

test('a watched sensor takes no impulse from the body it reports', () => {
    const world = makeWorld();
    addFloor(world);
    // A bouncy solid body lands on a watched matterless sensor sitting on the
    // floor. The sensor must neither move nor stop the body: being detectable
    // is not being solid.
    const sensor = watchedSensor(world);
    const restingY = sensor.rigidBody.translation().y;
    const falling = drop(world, 4.5, matter(0.8), true);

    settle(world, falling);

    expect(sensor.rigidBody.translation().y).toBeCloseTo(restingY, 6);
    // The solid body carried on to the floor rather than resting on the sensor.
    expect(falling.rigidBody.translation().y).toBeGreaterThan(-33);
    expect(falling.rigidBody.translation().y).toBeLessThan(-28);
});
