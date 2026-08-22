// Type-only: erased at build, so it adds no eager dependency on Rapier. The
// runtime value is loaded on demand via rapierLoader (see getWorldAtZ/sync).
import type * as RAPIER from '@dimforge/rapier2d-compat';
import {
    getRapier,
    loadRapier,
    onRapierLoaded,
    rapierLoaded,
} from '@output/physics/rapierLoader';
import { get } from 'svelte/store';
import { animationFactor } from '@db/Database';
import type { ReboundEvent } from '@input/Collision/Collision';
import Collision, { getWatchedNames } from '@input/Collision/Collision';
import { getPlacingMotion } from '@input/Motion/Motion';
import type Evaluator from '@runtime/Evaluator';
import type { OutputInfo, OutputInfoSet } from '@output/animation/Animator';
import { Circle } from '@output/Output/Shape/Circle';
import type { Form } from '@output/Output/Shape/Form';
import { Polygon } from '@output/Output/Shape/Polygon';
import { Rectangle } from '@output/Output/Shape/Rectangle';
import Group from '@output/Output/Group';
import type Matter from '@output/physics/Matter';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import Phrase from '@output/Output/Phrase';
import Shape from '@output/Output/Shape/Shape';
import Stage, { DefaultAir, DefaultGravity } from '@output/Output/Stage';

/** Interaction-group membership bits (Rapier packs membership in the high 16
 *  bits and the filter mask in the low 16 bits of a single u32). */
const TextCategory = 0b0001;
const ShapeCategory = 0b0010;

/** A large-but-finite angular inertia given to dynamic bodies so collisions
 *  don't spin them (matching the old Matter setInertia(Infinity)), while
 *  explicit angular velocity from Motion still works (setAngvel sets the state
 *  directly, unaffected by inertia). */
const PreventSpinInertia = 1e8;

/** Safety clamp on body speed, in px/s. Matter.js clamped to ±100 px per
 *  16.7ms frame, i.e. 6000 px/s; keep the same effective cap. */
const MaxSpeed = 6000;

/** Gravity calibration. Matter.js applied gravity as
 *  (g/20) × (1/(2·PX_PER_METER)) px/ms²; in px/s² (×1000²) that's g × 390.625
 *  at 64 px/m — about 6× "real" g in stage units. All the example projects
 *  were tuned to that feel (earth-like on a ~10m stage), so we reproduce the
 *  same effective acceleration rather than a physically literal g × PX_PER_METER. */
export const GravityPxPerS2PerUnit = 1_000_000 / (20 * 2 * PX_PER_METER);

/** Air-resistance calibration. Matter.js bodies default to frictionAir 0.01 —
 *  1% velocity loss per 16.7ms frame — which is what made bounces settle and
 *  motion coast to rest. Rapier's exponential damping equivalent:
 *  0.99^60 ≈ e^(-0.603·t), so ≈0.6 per second on both axes. Without this,
 *  restitution-1 bodies bounce forever. */
const AirDamping = 0.6;

/** Attraction calibration: the acceleration in px/s² that one unit of pull
 *  strength (mass × Matter.pull, in kg) produces one stage meter away. Like the
 *  gravity and velocity constants above this is a feel number, not a physical
 *  one — the three existing scale factors each reproduce a Matter.js behavior
 *  rather than any consistent unit system, so there is no G to derive. Picked so
 *  a 1000kg attractor pulls at about a tenth of default stage gravity from 5m,
 *  which orbits at a speed projects already write. */
const PullPxPerS2PerKg = 10;

/** How close two bodies may count as being, in stage meters, when computing
 *  attraction. Newton's 1/r² is unbounded as r → 0 and the engine has no notion
 *  of one body being inside another, so without a floor a direct hit flings
 *  output off stage. MaxSpeed is a backstop, not a substitute. */
const MinPullDistance = 0.5;

/**
 * A Rapier physics world to keep Scene simpler.
 * All details about Rapier should be encapsulated here,
 * hopefully not leaking out to Scene, Motion, or other related components. */
export default class Physics {
    /** The evaluator driving physics */
    readonly evaluator: Evaluator;

    /** A set of Rapier physics worlds, by integer z coordinate. */
    readonly worldsByZ: Map<number, RAPIER.World> = new Map();

    /** A single reused event queue drained after each world step. */
    private events: RAPIER.EventQueue | undefined = undefined;

    /** A mapping from output names to bodies */
    private bodyByName: Map<string, OutputBody> = new Map();

    /** Maps a collider's handle back to the output name (Rapier events give
     *  handles, not labels, so we resolve names ourselves). */
    private nameByColliderHandle: Map<number, string> = new Map();

    /** The latest stage synced */
    private stage: Stage | undefined = undefined;

    /** The hash of the barriers previously added */
    private previousShapes: Shape[] = [];
    private currentShapeBodies: {
        rigidBody: RAPIER.RigidBody;
        world: RAPIER.World;
        collider: RAPIER.Collider;
    }[] = [];

    /** Simulated time owed to the engine but not yet stepped, in ms.
     *  We feed Rapier fixed-size sub-steps to keep collision detection
     *  frame-rate-independent (variable elapsed values cause tunneling). */
    private accumulator = 0;

    /** How far the current frame sits past the last completed step, 0–1.
     *  Bodies are rendered that far along from where they were, so motion is
     *  smooth however far the display's refresh rate and the fixed step drift
     *  apart. 1 means "exactly at the last step", which is the honest answer
     *  before the first tick and whenever the simulation is frozen. */
    private alpha = 1;

    /** Bodies whose Placement-driven displacement this frame is large enough
     *  to risk tunneling. tick() interpolates them across sub-steps so the
     *  engine can catch overlaps along the path. */
    private sweepingBodies: Map<
        OutputBody,
        { from: { x: number; y: number }; to: { x: number; y: number } }
    > = new Map();

    /** True once we've registered to re-evaluate when a pending Rapier load
     *  finishes, so we register at most one callback per outstanding load. */
    private awaitingRapier = false;

    /** The bodies that pull on others, with their strength (mass × pull, kg),
     *  rebuilt each sync because both come from a Matter that is re-read every
     *  frame. Empty for every project that never writes pull, which is what
     *  keeps attraction free for everyone else. */
    private attractors: {
        world: RAPIER.World;
        rigidBody: RAPIER.RigidBody;
        strength: number;
    }[] = [];

    constructor(evaluator: Evaluator) {
        this.evaluator = evaluator;
    }

    /** sync() bailed because Rapier isn't loaded yet. Rapier loads only on the
     *  first frame that needs physics, and a pure-physics program produces no
     *  new stream values (so no re-evaluation, so no re-sync) until bodies
     *  exist — a deadlock the user can currently only break by clicking. Force
     *  a fresh evaluation once the load resolves so sync() runs again and
     *  creates the bodies. */
    private resyncWhenRapierLoads() {
        if (this.awaitingRapier) return;
        this.awaitingRapier = true;
        onRapierLoaded(() => {
            this.awaitingRapier = false;
            if (!this.evaluator.isStopped()) this.evaluator.start();
        });
    }

    getWorldAtZ(z: number) {
        // Only reached from sync()/barrier sync, past the loadRapier() gate.
        const RAPIER = getRapier();
        let world = this.worldsByZ.get(Math.round(z));

        // No world yet for this depth? Make one.
        if (world === undefined) {
            // gravity.y is set per-frame in sync() from the Stage's gravity.
            world = new RAPIER.World({ x: 0, y: 0 });

            // Fixed 16ms sub-steps (see tick()); Rapier's timestep is in seconds.
            world.timestep = FIXED_STEP_MS / 1000;

            // Interpret the world in pixel units so Rapier's internal
            // length-based tolerances (prediction distance, allowed error,
            // sleep thresholds) scale correctly to our PX_PER_METER space.
            world.lengthUnit = PX_PER_METER;

            this.worldsByZ.set(Math.round(z), world);
        }

        return world;
    }

    /** Rotation is degrees */
    createRectangle(rectangle: Rectangle, rotation: number | undefined) {
        // Compute rectangle boundaries in engine coordinates.
        const left = rectangle.getLeft() * PX_PER_METER;
        const right =
            (rectangle.getLeft() + rectangle.getWidth()) * PX_PER_METER;
        const top = -rectangle.getTop() * PX_PER_METER;
        const bottom =
            -(rectangle.getTop() - rectangle.getHeight()) * PX_PER_METER;

        return this.createBarrierBody(
            (left + right) / 2,
            (top + bottom) / 2,
            ((rotation ?? 0) * Math.PI) / 180,
            (RAPIER) =>
                RAPIER.ColliderDesc.cuboid(
                    Math.abs(right - left) / 2,
                    Math.abs(bottom - top) / 2,
                ),
            rectangle.getZ(),
        );
    }

    /** Create a circle barrier */
    createCircle(circle: Circle) {
        const x = circle.x * PX_PER_METER;
        const y = -circle.y * PX_PER_METER;
        const radius = circle.radius * PX_PER_METER;

        return this.createBarrierBody(
            x,
            y,
            0,
            (RAPIER) => RAPIER.ColliderDesc.ball(radius),
            circle.getZ(),
        );
    }

    /** Create a regular-polygon barrier */
    createPolygon(polygon: Polygon) {
        const x = polygon.x * PX_PER_METER;
        const y = -polygon.y * PX_PER_METER;
        const radius = polygon.radius * PX_PER_METER;

        return this.createBarrierBody(
            x,
            y,
            0,
            // convexHull returns null on a degenerate hull; fall back to a
            // ball so a barrier still exists.
            (RAPIER) =>
                RAPIER.ColliderDesc.convexHull(
                    regularPolygonVertices(polygon.sides, radius),
                ) ?? RAPIER.ColliderDesc.ball(radius),
            polygon.getZ(),
        );
    }

    /** Shared barrier creation: a fixed rigid body positioned/rotated in engine
     *  space, plus a collider (parented to it) from the caller's descriptor. */
    private createBarrierBody(
        x: number,
        y: number,
        angle: number,
        makeDesc: (rapier: typeof RAPIER) => RAPIER.ColliderDesc,
        z: number,
    ): {
        rigidBody: RAPIER.RigidBody;
        world: RAPIER.World;
        collider: RAPIER.Collider;
    } {
        const RAPIER = getRapier();
        const world = this.getWorldAtZ(z);
        const rigidBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.fixed()
                .setTranslation(x, y)
                .setRotation(angle),
        );
        const collider = world.createCollider(
            makeDesc(RAPIER)
                // Matter.js gave barriers its default friction (0.1) and no
                // restitution, and resolved pairs with min(friction) /
                // max(restitution); mirror all four so contact feel matches.
                .setFriction(0.1)
                .setRestitution(0)
                .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
                .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
                .setCollisionGroups(ShapeInteractionGroups)
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                .setActiveCollisionTypes(AllCollisionTypes(RAPIER)),
            rigidBody,
        );
        return { rigidBody, world, collider };
    }

    /** Given the current and prior scenes, and the time elapsed since the last one, sync the physics world. */
    sync(
        stage: Stage,
        current: OutputInfoSet,
        exiting: Map<string, OutputInfo>,
    ) {
        // Update the stage
        this.stage = stage;

        // REMOVE all of the exited outputs from the world.
        for (const name of exiting.keys()) this.removeOutputBody(name);

        // What the Collision streams are watching for. A name something is
        // watching is reason enough to give an output a body, so naming two
        // things is all it takes to make them notice each other (#548).
        // Recomputed every sync because the names are runtime values: a stream
        // can be handed a different one on any evaluation.
        const watched = getWatchedNames(
            this.evaluator.getBasisStreamsOfType(Collision),
        );

        // Rebuilt below from whatever currently has a non-zero Matter.pull.
        this.attractors = [];

        // CREATE and UPDATE bodies for all outputs currently in the scene.

        // Iterate through all of the output in the current scene.
        for (const [name, info] of current) {
            // Is it inside a group? Pass. We only include top level elements in physics, since there's a single coordinate system that they share.
            // Groups have their own local coordinate systems.
            if (info.parents[0] instanceof Group) {
                continue;
            }

            // Is it a stage? Update all world's gravity based on the stage's latest value.
            if (info.output instanceof Stage) {
                // Set the gravity to the Stage's gravity setting. Gravity is an
                // acceleration in px/s²; engine y is negated stage y (down is
                // +y), so positive gravity pulls output downward on screen.
                for (const world of this.worldsByZ.values()) {
                    world.gravity.x = 0;
                    world.gravity.y =
                        (info.output.gravity ?? DefaultGravity) *
                        GravityPxPerS2PerUnit;
                }
            }
            // Other kind of output? Sync it.
            else {
                // Does the output have matter?
                const matter =
                    info.output instanceof Phrase ||
                    info.output instanceof Group
                        ? info.output.matter
                        : undefined;

                // Is there a motion stream responsible for this output's place?
                // Placement also produces places, and those outputs must stay
                // position-driven below. The animator asks the same question to
                // decide whether a move is worth tweening.
                const motion = getPlacingMotion(this.evaluator, info.output);

                // Is a Collision watching this name? Then it needs a body
                // to be detected in, whatever else is true of it. A Shape
                // directly on the Stage is excepted: it's already in the world
                // as a barrier below, and a second body under the same name
                // would report every touch twice.
                const detectable =
                    watched.has(name) && !(info.output instanceof Shape);

                // If the output has matter, is in motion, or is being watched,
                // make sure it's in the physics world.
                if (matter || motion || detectable) {
                    // First frame that actually needs physics: kick off the
                    // Rapier load and skip until it resolves (retried next
                    // frame). Cheap once loaded — returns the cached module.
                    const RAPIER = loadRapier();
                    if (RAPIER === undefined) {
                        this.resyncWhenRapierLoads();
                        return;
                    }

                    // Get the body that we already made using it's name.
                    let shape = this.bodyByName.get(name);

                    // Doesn't exist or changed size? Make one and add it to the world
                    // for it's z value.
                    if (
                        shape === undefined ||
                        shape.width !== info.width ||
                        shape.height !== info.height
                    ) {
                        // Get the world for this z depth
                        const world = this.getWorldAtZ(info.global.z);

                        // If we already had a body, remove it so we can replace with a new one.
                        if (shape !== undefined) {
                            this.removeOutputBody(name);
                        }

                        // Make a new body for this new output.
                        shape = this.createOutputBody(
                            info,
                            matter,
                            detectable,
                            world,
                        );

                        // Remember the body by name and its collider handle.
                        this.bodyByName.set(name, shape);
                        this.nameByColliderHandle.set(
                            shape.collider.handle,
                            name,
                        );
                    }

                    // Motion bodies are dynamic (simulated); everything else is
                    // kinematic (position-driven). Toggle the type if it changed.
                    const wantDynamic = motion !== undefined;
                    const isDynamic =
                        shape.rigidBody.bodyType() ===
                        RAPIER.RigidBodyType.Dynamic;
                    if (wantDynamic !== isDynamic) {
                        shape.rigidBody.setBodyType(
                            wantDynamic
                                ? RAPIER.RigidBodyType.Dynamic
                                : RAPIER.RigidBodyType.KinematicPositionBased,
                            true,
                        );
                        // Whatever it did as the other kind of body is not a
                        // path it is part-way along now.
                        shape.resetInterpolation();
                    }

                    // No motion but has matter? Either teleport directly or,
                    // if the displacement is large enough to risk skipping
                    // through another body, defer to tick() which will sweep
                    // across sub-steps.
                    if (motion === undefined) {
                        const target = shape.getPosition(
                            info.global.x,
                            info.global.y,
                            info.width,
                            info.height,
                        );
                        const position = shape.rigidBody.translation();
                        const dx = target.x - position.x;
                        const dy = target.y - position.y;
                        const halfMin =
                            (PX_PER_METER *
                                Math.min(shape.width, shape.height)) /
                            2;
                        if (dx * dx + dy * dy <= halfMin * halfMin) {
                            shape.rigidBody.setTranslation(target, true);
                        } else {
                            this.sweepingBodies.set(shape, {
                                from: { x: position.x, y: position.y },
                                to: target,
                            });
                        }
                    }

                    // Did we make or find a corresponding body? Apply any Place or Velocity overrides in the Motion.
                    if (motion) motion.updateBody(shape);

                    // Set the body's current angle if the program gave it one.
                    // An output's pose rotation defaults to its place's, and a
                    // simulated place carries the angle the engine just
                    // computed — so writing that back is at best a no-op, and
                    // once places are interpolated it would feed a part-way
                    // angle in as truth and drag every spin backwards. A place
                    // with no rotation of its own is still the program's to set,
                    // which is how an authored rotation reaches a new body.
                    if (
                        info.output.place?.rotation === undefined &&
                        info.output.pose.rotation !== undefined
                    ) {
                        shape.rigidBody.setRotation(
                            (info.output.pose.rotation * Math.PI) / 180,
                            true,
                        );
                        shape.resetInterpolation();
                    }

                    // Air resistance is a property of the stage, not the body,
                    // so it is re-applied per frame like the matter properties
                    // below: a program can put its output in space and take it
                    // out again. AirDamping is the multiplier's 1.
                    const drag = AirDamping * (stage.air ?? DefaultAir);
                    shape.rigidBody.setLinearDamping(drag);
                    shape.rigidBody.setAngularDamping(drag);

                    // Does this output pull on others? Remember it for tick().
                    // A kinematic body attracts perfectly well without being
                    // attracted itself, which is what makes a fixed sun work.
                    if (matter && matter.pull !== 0)
                        this.attractors.push({
                            world: shape.world,
                            rigidBody: shape.rigidBody,
                            strength: matter.mass * matter.pull,
                        });

                    // Set matter properties if available.
                    if (matter) {
                        shape.collider.setRestitution(matter.bounciness);
                        shape.collider.setFriction(matter.friction);
                        // A large angular inertia keeps collisions from spinning
                        // the body while explicit Motion angular velocity works.
                        shape.collider.setMassProperties(
                            matter.mass,
                            { x: 0, y: 0 },
                            PreventSpinInertia,
                        );
                    }

                    // Set the collision filter based on the matter settings
                    // and whether anything is watching this name.
                    shape.collider.setCollisionGroups(
                        getInteractionGroups(matter, detectable),
                    );

                    // Bodies whose position is set externally (by Placement or
                    // a static Place) become sensors: they still fire collision
                    // events, but the solver doesn't apply separation impulses
                    // that would fight the per-frame setTranslation. Without
                    // this, the solver pushes overlapping bodies apart every
                    // step, sync teleports them back, and Collision oscillates
                    // between start/end at frame rate.
                    //
                    // Matter is also what makes a body solid, so one without it
                    // is a sensor however it's placed: a body pulled in only
                    // because a Collision watches its name reports contacts
                    // without being able to change how anything moves.
                    shape.collider.setSensor(
                        motion === undefined || matter === undefined,
                    );
                }
                // No motion, matter, or watcher? Remove it from the world
                // so it doesn't mess with collisions.
                else {
                    this.removeOutputBody(name);
                }
            }
        }

        // Sync barriers.
        if (this.stage) {
            const shapes = this.stage.getShapes();

            // If the shapes changed update them in the world.
            if (
                this.previousShapes.length !== shapes.length ||
                !this.previousShapes.every((shape, index) =>
                    shape.value.isEqualTo(shapes[index].value),
                )
            ) {
                // Barriers need Rapier too; load on demand and skip this
                // frame until it's ready (same gate as moving output above).
                const RAPIER = loadRapier();
                if (RAPIER === undefined) {
                    this.resyncWhenRapierLoads();
                    return;
                }

                // Remove the bodies previously added, and any name records.
                for (const record of this.currentShapeBodies) {
                    this.nameByColliderHandle.delete(record.collider.handle);
                    record.world.removeRigidBody(record.rigidBody);
                }

                // Add the revised bodies
                this.currentShapeBodies = [];
                for (const barrier of shapes) {
                    const created =
                        barrier.form instanceof Rectangle
                            ? this.createRectangle(
                                  barrier.form,
                                  barrier.pose.rotation,
                              )
                            : barrier.form instanceof Circle
                              ? this.createCircle(barrier.form)
                              : barrier.form instanceof Polygon
                                ? this.createPolygon(barrier.form)
                                : undefined;

                    if (created) {
                        // Named barriers appear in Collision rebounds by name
                        // (matching the old Matter body labels), so programs can
                        // react to specific Shapes — or exempt them from a
                        // catch-all Collision by checking the name.
                        if (barrier.name)
                            this.nameByColliderHandle.set(
                                created.collider.handle,
                                barrier.getName(),
                            );
                        this.currentShapeBodies.push(created);
                    }
                }

                // Remember what we added.
                this.previousShapes = shapes;
            }
        }
    }

    tick(elapsed: number) {
        // Nothing to step until sync() has loaded Rapier and created bodies.
        // tick() runs every frame for every project, so it must not itself
        // trigger the load — only sync() does, when physics output appears.
        if (!rapierLoaded()) return;
        const RAPIER = getRapier();
        // Nothing is part-way anywhere until the simulation runs again.
        this.alpha = 1;

        const factor = get(animationFactor);

        // Frozen world (animationFactor 0 / calm mode): finalize any deferred
        // moves so bodies stay where Placement put them, then skip simulation.
        if (factor <= 0) {
            for (const [shape, move] of this.sweepingBodies)
                shape.rigidBody.setTranslation(move.to, true);
            this.sweepingBodies.clear();
            return;
        }

        // Run as many fixed sub-steps as fit. Cap iterations so very slow
        // machines don't spiral; better to let simulated time fall behind
        // real time than feed huge variable steps to the engine, which
        // causes tunneling and missed collisions.
        //
        // The accumulator is assigned BEFORE the step loop, not after.
        // world.step fires collision events that the Collision-stream
        // handler eventually lands in Evaluator.end(), which calls
        // physics.tick(0) "just in case" there are pending collisions to
        // surface. With a post-loop assignment, that reentrant tick(0) saw
        // the same accumulator value, computed the same `steps`, and
        // re-stepped — infinite recursion. Assigning first means the
        // reentrant tick(0) sees the accumulator already drained for this
        // batch, computes steps=0, and returns cleanly.
        const MAX_STEPS = 4;
        const plan = planSteps(this.accumulator, elapsed, factor, MAX_STEPS);
        const steps = plan.steps;
        this.accumulator = plan.accumulator;
        // How far past the last completed step this frame sits, so getPlace
        // can report where a body is *now* rather than where it was when the
        // engine last moved. Kept even on a frame that takes no step: that is
        // the frame this exists for.
        this.alpha = plan.alpha;

        if (steps > 0) {
            const events = this.getEvents(RAPIER);
            for (let i = 1; i <= steps; i++) {
                // Remember where every simulated body starts the final step,
                // so a frame landing between steps can be drawn between them.
                // Only the last iteration can be the one interpolated from.
                if (i === steps)
                    for (const body of this.bodyByName.values())
                        body.snapshot();
                // Interpolate sweeping bodies along their path so the engine
                // can detect overlaps at intermediate positions. Kinematic
                // bodies move via setNextKinematicTranslation so the step
                // generates proper contacts.
                const t = i / steps;
                for (const [shape, move] of this.sweepingBodies) {
                    shape.rigidBody.setNextKinematicTranslation({
                        x: move.from.x + (move.to.x - move.from.x) * t,
                        y: move.from.y + (move.to.y - move.from.y) * t,
                    });
                }
                for (const world of this.worldsByZ.values()) {
                    this.applyAttraction(world, RAPIER);
                    world.step(events);
                    this.drainCollisions(world, events);
                    clampSpeeds(world, RAPIER);
                }
            }
        }

        // Ensure sweeping bodies reach their final target (covers steps == 0).
        for (const [shape, move] of this.sweepingBodies)
            shape.rigidBody.setTranslation(move.to, true);
        this.sweepingBodies.clear();
    }

    /** Pull every dynamic body in this world toward the attractors in it.
     *
     *  Applied as a one-shot impulse per sub-step rather than addForce, because
     *  Rapier user forces persist until resetForces: a force would have to be
     *  cleared every sub-step as the bodies move, where an impulse composes
     *  with clampSpeeds directly after the step. Waking is not optional — a
     *  settled body ignores forces entirely until it wakes (see the sleep test
     *  in simulation.test.ts).
     *
     *  Attraction only reaches within one world, so output at different depths
     *  never pulls on each other; each z has a world of its own. */
    private applyAttraction(world: RAPIER.World, rapier: typeof RAPIER) {
        // Nothing pulls: the case every project that never writes pull takes.
        if (this.attractors.length === 0) return;
        const attractors = this.attractors.filter((a) => a.world === world);
        if (attractors.length === 0) return;

        world.bodies.forEach((body: RAPIER.RigidBody) => {
            // Only a dynamic body responds to an impulse at all, which is why a
            // Motion is what makes output movable by a pull.
            if (body.bodyType() !== rapier.RigidBodyType.Dynamic) return;
            const at = body.translation();
            const mass = body.mass();
            let x = 0;
            let y = 0;
            for (const attractor of attractors) {
                // A body never pulls on itself.
                if (attractor.rigidBody === body) continue;
                const source = attractor.rigidBody.translation();
                const pull = pullAcceleration(
                    source.x - at.x,
                    source.y - at.y,
                    attractor.strength,
                );
                x += pull.x;
                y += pull.y;
            }
            if (x === 0 && y === 0) return;
            // Impulse is mass × Δv, and Δv is the acceleration over one step.
            const impulse = mass * world.timestep;
            body.applyImpulse({ x: x * impulse, y: y * impulse }, true);
        });
    }

    /** Lazily create the reused event queue. */
    private getEvents(rapier: typeof RAPIER) {
        if (this.events === undefined)
            this.events = new rapier.EventQueue(true);
        return this.events;
    }

    /** Drain collision events from the queue into the Collision streams,
     *  resolving handles to names and computing a direction vector. */
    private drainCollisions(world: RAPIER.World, events: RAPIER.EventQueue) {
        const rebounds: ReboundEvent[] = [];
        events.drainCollisionEvents((handle1, handle2, started) => {
            const subject = this.nameByColliderHandle.get(handle1);
            const object = this.nameByColliderHandle.get(handle2);
            // Ignore collisions with bodies we don't track (barriers have no name).
            if (subject === undefined && object === undefined) return;

            let direction = { x: 0, y: 0 };
            if (started) {
                const collider1 = world.getCollider(handle1);
                const collider2 = world.getCollider(handle2);
                if (collider1 && collider2) {
                    // Prefer the contact manifold normal (solid contacts).
                    let normal: { x: number; y: number } | undefined;
                    world.contactPair(
                        collider1,
                        collider2,
                        (manifold, flipped) => {
                            const n = manifold.normal();
                            // The normal points from the first to the second shape;
                            // un-flip so it's always subject→object.
                            normal = flipped ? { x: -n.x, y: -n.y } : n;
                        },
                    );
                    // Sensors generate no contact manifold; fall back to the
                    // center-to-center direction between the two colliders.
                    if (normal === undefined) {
                        const a = collider1.translation();
                        const b = collider2.translation();
                        normal = { x: b.x - a.x, y: b.y - a.y };
                    }
                    const length = Math.hypot(normal.x, normal.y) || 1;
                    // Scale to px so Collision's /PX_PER_METER yields a unit vector.
                    direction = {
                        x: (normal.x / length) * PX_PER_METER,
                        y: (normal.y / length) * PX_PER_METER,
                    };
                }
            }

            rebounds.push({
                subject: subject ?? '',
                object: object ?? '',
                direction,
                starting: started,
            });
        });
        if (rebounds.length > 0) this.report(rebounds);
    }

    removeOutputBody(name: string) {
        const outputBody = this.bodyByName.get(name);
        if (outputBody) {
            // A body exists, so Rapier was loaded when it was created.
            this.nameByColliderHandle.delete(outputBody.collider.handle);
            outputBody.world.removeRigidBody(outputBody.rigidBody);
            this.bodyByName.delete(name);

            // If the world is now empty, remove it.
            if (outputBody.world.bodies.len() === 0) {
                for (const [z, world] of this.worldsByZ) {
                    if (world === outputBody.world) {
                        world.free();
                        this.worldsByZ.delete(z);
                        break;
                    }
                }
            }
        }
    }

    createOutputBody(
        info: OutputInfo,
        matter: Matter | undefined,
        detectable: boolean,
        world: RAPIER.World,
    ) {
        const { width, height } = info.output.getLayout(info.context);
        return new OutputBody(
            world,
            info.output.getName(),
            info.global.x,
            info.global.y,
            width,
            height,
            ((info.output.pose.rotation ?? 0) * Math.PI) / 180,
            // Round corners by a fraction of their size
            (matter?.roundedness ?? 0.1) *
                (info.output.size ?? info.context.size),
            matter,
            detectable,
            // A Shape's collision body matches its form (circle/polygon); everything else (Phrase,
            // Group, a Rectangle Shape) uses its bounding box. width/height stay the bounding box so
            // the position/place math is form-agnostic.
            info.output instanceof Shape ? info.output.form : undefined,
        );
    }

    /** Get the body corresponding to the given output name */
    getOutputBody(name: string): OutputBody | undefined {
        return this.bodyByName.get(name);
    }

    /** Where this body is on this frame — between the last two simulated steps
     *  when the frame lands between them, which above ~62Hz, or at any animation
     *  factor above 1, is most frames. Keeps the render phase in here rather
     *  than making every caller remember to ask for it. */
    getPlace(name: string) {
        return this.bodyByName.get(name)?.getPlace(this.alpha);
    }

    /** Report the given collisions to the evaluator's collision streams */
    report(rebounds: ReboundEvent[]) {
        // Get the streams.
        const collisions = this.evaluator.getBasisStreamsOfType(Collision);

        for (const collision of collisions) {
            for (const rebound of rebounds) collision.react(rebound);
        }
    }

    stop() {
        // Clear the physics worlds.
        for (const [z, world] of this.worldsByZ) {
            world.free();
            this.worldsByZ.delete(z);
        }
        this.bodyByName.clear();
        this.nameByColliderHandle.clear();
        this.currentShapeBodies = [];
        this.events?.free();
        this.events = undefined;
    }
}

export const FIXED_STEP_MS = 16;

/** A body's placement in engine space: pixels, and an angle in radians. */
export type BodyTransform = { x: number; y: number; angle: number };

/**
 * How far to advance the simulation this frame, and how far past the last
 * completed step the frame itself sits.
 *
 * Split out from `tick` because the arithmetic is the whole of the smoothness
 * problem and needs testing without Rapier or a browser. The engine only ever
 * moves in whole `FIXED_STEP_MS` jumps, so what a frame lands between two of
 * them has to be rendered by interpolating rather than by rounding down — at
 * 120Hz, or at any animation factor above 1, most frames take no step at all
 * and would otherwise repeat the previous position exactly.
 */
export function planSteps(
    accumulator: number,
    elapsed: number,
    factor: number,
    maxSteps: number,
): { steps: number; accumulator: number; alpha: number } {
    // animationFactor is an inverse-speed multiplier, so this is already
    // simulated time — the right clock for a render of simulated state. Cap
    // the per-call delta so a long pause or hidden tab doesn't dump huge time
    // into the accumulator.
    let remaining = accumulator + Math.min(elapsed / factor, 100);
    const steps = Math.min(Math.floor(remaining / FIXED_STEP_MS), maxSteps);
    if (steps > 0) remaining -= steps * FIXED_STEP_MS;
    if (steps === maxSteps)
        // Simulated time is being dropped on the floor to stop a spiral, so
        // there is no partial step left to be part-way through: show the state
        // the engine actually reached rather than rewinding a step to it.
        return { steps, accumulator: 0, alpha: 1 };
    return { steps, accumulator: remaining, alpha: remaining / FIXED_STEP_MS };
}

/**
 * Where a body is `alpha` of the way from its previous step to its current one.
 *
 * Angles take the shortest arc, since Rapier reports a normalized angle in
 * (-π, π] and a body crossing that seam would otherwise appear to spin most of
 * the way back around. A spin fast enough to turn more than half a circle in
 * one step is genuinely ambiguous and comes out as the short way regardless;
 * the engine caps rotation well below that, and a characterization test pins it.
 */
export function interpolateTransform(
    previous: BodyTransform | undefined,
    current: BodyTransform,
    alpha: number,
): BodyTransform {
    if (previous === undefined || alpha >= 1) return current;
    if (alpha <= 0) return previous;
    const turn =
        ((((current.angle - previous.angle + Math.PI) % (2 * Math.PI)) +
            2 * Math.PI) %
            (2 * Math.PI)) -
        Math.PI;
    return {
        x: previous.x + (current.x - previous.x) * alpha,
        y: previous.y + (current.y - previous.y) * alpha,
        angle: previous.angle + turn * alpha,
    };
}

/** All active collision types, so events fire even between the kinematic /
 *  fixed pairs Rapier ignores by default (KINEMATIC_FIXED, KINEMATIC_KINEMATIC).
 *  DEFAULT already covers dynamic-vs-anything. */
function AllCollisionTypes(rapier: typeof RAPIER) {
    return (
        rapier.ActiveCollisionTypes.DEFAULT |
        rapier.ActiveCollisionTypes.KINEMATIC_FIXED |
        rapier.ActiveCollisionTypes.KINEMATIC_KINEMATIC
    );
}

/** Barrier colliders belong to the Shape category and collide with text + shapes. */
const ShapeInteractionGroups =
    (ShapeCategory << 16) | (TextCategory | ShapeCategory);

/** A rounded rectangle collider matching the old Matter chamfer: the border
 *  radius is inset so the shape's total half-extents stay the bounding box.
 *  `corner` is in output units (meters). */
function roundCuboidDesc(
    rapier: typeof RAPIER,
    width: number,
    height: number,
    corner: number,
) {
    const halfWidth = (PX_PER_METER * width) / 2;
    const halfHeight = (PX_PER_METER * height) / 2;
    // Border radius can't exceed the smaller half-extent, or the inset goes negative.
    const border = Math.min(
        corner * PX_PER_METER,
        halfWidth - 0.5,
        halfHeight - 0.5,
    );
    if (border <= 0) return rapier.ColliderDesc.cuboid(halfWidth, halfHeight);
    return rapier.ColliderDesc.roundCuboid(
        halfWidth - border,
        halfHeight - border,
        border,
    );
}

/** Regular-polygon vertices centered at the origin, as a flat Float32Array. */
function regularPolygonVertices(sides: number, radius: number): Float32Array {
    const points = new Float32Array(sides * 2);
    for (let i = 0; i < sides; i++) {
        points[i * 2] = radius * Math.cos((2 * Math.PI * i) / sides);
        points[i * 2 + 1] = radius * Math.sin((2 * Math.PI * i) / sides);
    }
    return points;
}

/**
 * The acceleration, in px/s², that an attractor of the given strength
 * (mass × pull, in kg) imparts on a body offset from it by (dx, dy) px.
 *
 * Expressed as an acceleration rather than a force so the pulled body's own
 * mass cancels, as it does in reality. That matters here beyond tidiness: a
 * Motion body with no Matter is given mass 10 rather than 1 (see OutputBody),
 * so anything proportional to the pulled mass would behave ten times
 * differently for a phrase that simply never mentioned Matter.
 *
 * Separated out from the engine so the whole of the attraction math can be
 * tested without Rapier, as planSteps and interpolateTransform are.
 */
export function pullAcceleration(
    dx: number,
    dy: number,
    strength: number,
): { x: number; y: number } {
    // Work in stage meters: the constant is calibrated per meter, and metres are
    // what a creator reasons about when placing output.
    const x = dx / PX_PER_METER;
    const y = dy / PX_PER_METER;
    const distance = Math.hypot(x, y);
    // Exactly coincident: no direction to pull in, so no pull.
    if (distance === 0) return { x: 0, y: 0 };
    const softened = Math.max(distance, MinPullDistance);
    const magnitude = (PullPxPerS2PerKg * strength) / (softened * softened);
    // Toward the attractor for positive strength, away for negative.
    return { x: (x / distance) * magnitude, y: (y / distance) * magnitude };
}

/** Clamp every dynamic body's speed to MaxSpeed (px/s). */
function clampSpeeds(world: RAPIER.World, rapier: typeof RAPIER) {
    world.bodies.forEach((body: RAPIER.RigidBody) => {
        if (body.bodyType() !== rapier.RigidBodyType.Dynamic) return;
        const v = body.linvel();
        const speed = Math.hypot(v.x, v.y);
        if (speed > MaxSpeed) {
            const scale = MaxSpeed / speed;
            body.setLinvel({ x: v.x * scale, y: v.y * scale }, true);
        }
    });
}

/** This wrapper helps us remember width and height, avoiding redundant computation. */
export class OutputBody {
    readonly world: RAPIER.World;
    readonly rigidBody: RAPIER.RigidBody;
    readonly collider: RAPIER.Collider;
    readonly width: number;
    readonly height: number;
    constructor(
        world: RAPIER.World,
        name: string,
        left: number,
        bottom: number,
        width: number,
        height: number,
        angle: number,
        corner: number,
        matter: Matter | undefined,
        detectable: boolean,
        form: Form | undefined,
    ) {
        // Constructed only from Physics.createOutputBody, past the load gate.
        const RAPIER = getRapier();
        this.world = world;
        const position = this.getPosition(left, bottom, width, height);

        // Created dynamic; Physics.sync toggles to kinematic when there's no
        // Motion. A large angular inertia below prevents collision-induced spin.
        this.rigidBody = world.createRigidBody(
            RAPIER.RigidBodyDesc.dynamic()
                .setTranslation(position.x, position.y)
                .setRotation(angle)
                // Matter.js frictionAir equivalent (see AirDamping).
                .setLinearDamping(AirDamping)
                .setAngularDamping(AirDamping),
        );

        // Match the collision body to the form: a Circle collides as a circle, a Polygon as its
        // regular polygon (both centered, with the form's radius). Everything else — a Phrase, a
        // Group, or a Rectangle Shape — collides as its bounding box, with rounded corners.
        const desc =
            form instanceof Circle
                ? RAPIER.ColliderDesc.ball(form.radius * PX_PER_METER)
                : form instanceof Polygon
                  ? (RAPIER.ColliderDesc.convexHull(
                        regularPolygonVertices(
                            form.sides,
                            form.radius * PX_PER_METER,
                        ),
                    ) ?? RAPIER.ColliderDesc.ball(form.radius * PX_PER_METER))
                  : roundCuboidDesc(RAPIER, width, height, corner);

        this.collider = world.createCollider(
            desc
                .setRestitution(matter?.bounciness ?? 0)
                .setFriction(matter?.friction ?? 0)
                // Matter.js resolved contact pairs with min(friction) and
                // max(restitution); Rapier defaults to averaging both, which
                // halves bounces against rigid barriers and adds phantom
                // friction to frictionless output. Mirror Matter's rules.
                .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
                .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
                // Matter.js created bodies with mass ×10 but sync immediately
                // reset any body WITH matter to its unscaled mass — so the
                // effective mass was matter.mass, or 10 for motion-only bodies.
                .setMassProperties(
                    matter ? matter.mass : 10,
                    { x: 0, y: 0 },
                    PreventSpinInertia,
                )
                .setCollisionGroups(getInteractionGroups(matter, detectable))
                .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
                .setActiveCollisionTypes(AllCollisionTypes(RAPIER)),
            this.rigidBody,
        );

        this.width = width;
        this.height = height;
    }

    /** Convert a Place position into an engine position (bounding-box center). */
    getPosition(left: number, bottom: number, width: number, height: number) {
        return {
            // Body center is half the width from left
            x: PX_PER_METER * (left + width / 2),
            // Negate top to flip y-axes than add half of height to get center
            y: PX_PER_METER * -(bottom + height / 2),
        };
    }

    /** Where this body was when the engine last began a step, so a frame that
     *  lands between steps can be drawn between them. Undefined until it has
     *  been stepped at least once, and cleared whenever the program moves the
     *  body itself — there is no path to be part-way along across a teleport. */
    private previous: BodyTransform | undefined = undefined;

    /** Remember the current transform as the one to interpolate from. */
    snapshot() {
        const position = this.rigidBody.translation();
        this.previous = {
            x: position.x,
            y: position.y,
            angle: this.rigidBody.rotation(),
        };
    }

    /** Forget it, so the next frame draws this body where it now is rather than
     *  gliding it there from wherever it used to be. */
    resetInterpolation() {
        this.previous = undefined;
    }

    /** Convert the engine position into stage Place values, `alpha` of the way
     *  from the last step to the current one. */
    getPlace(alpha = 1) {
        const position = this.rigidBody.translation();
        const at = interpolateTransform(
            this.previous,
            {
                x: position.x,
                y: position.y,
                angle: this.rigidBody.rotation(),
            },
            alpha,
        );
        return {
            x: at.x / PX_PER_METER - this.width / 2,
            y: -at.y / PX_PER_METER - this.height / 2,
            angle:
                (isNaN(at.angle) ||
                at.angle === Infinity ||
                at.angle === -Infinity
                    ? 0
                    : at.angle * 180) / Math.PI,
        };
    }
}

/** Abstract away the interaction-group packing for output bodies. */
function getInteractionGroups(matter: Matter | undefined, detectable: boolean) {
    // Rapier packs membership in the high 16 bits, the filter mask in the low 16.
    if (matter) {
        const filter =
            (matter.text ? TextCategory : 0) |
            (matter.shapes ? ShapeCategory : 0);
        return (TextCategory << 16) | filter;
    }
    // No matter, but a Collision is watching this name: collide with everything
    // so it is detected. Such a body is always a sensor, so joining the world
    // reports contacts without changing how anything moves.
    if (detectable) return (TextCategory << 16) | TextCategory | ShapeCategory;
    // Watched by nothing: member of Text, but collides with nothing.
    return TextCategory << 16;
}
