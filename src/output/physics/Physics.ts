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
import Collision from '@input/Collision/Collision';
import Motion from '@input/Motion/Motion';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
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
import Stage, { DefaultGravity } from '@output/Output/Stage';

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
const GravityPxPerS2PerUnit = 1_000_000 / (20 * 2 * PX_PER_METER);

/** Air-resistance calibration. Matter.js bodies default to frictionAir 0.01 —
 *  1% velocity loss per 16.7ms frame — which is what made bounces settle and
 *  motion coast to rest. Rapier's exponential damping equivalent:
 *  0.99^60 ≈ e^(-0.603·t), so ≈0.6 per second on both axes. Without this,
 *  restitution-1 bodies bounce forever. */
const AirDamping = 0.6;

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

        // CREATE and UPDATE bodies for all outputs currently in the scene.

        // Create an index of all of the Motion stream's recent places so we can map output's places back to motion streams.
        const motionByPlace = new Map<Value, Motion>();
        for (const motion of this.evaluator.getBasisStreamsOfType(Motion)) {
            for (const value of motion.values.slice(-10))
                motionByPlace.set(value.value, motion);
        }

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

                // Is there a motion stream responsible for this output's place? The motion may
                const motion = info.output.place
                    ? motionByPlace.get(info.output.place.value)
                    : undefined;

                // If the output has matter or is in motion, make sure it's in the physics world.
                if (matter || motion) {
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
                        shape = this.createOutputBody(info, matter, world);

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
                    if (wantDynamic !== isDynamic)
                        shape.rigidBody.setBodyType(
                            wantDynamic
                                ? RAPIER.RigidBodyType.Dynamic
                                : RAPIER.RigidBodyType.KinematicPositionBased,
                            true,
                        );

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

                    // Set the body's current angle if it has one, otherwise leave it alone.
                    if (info.output.pose.rotation !== undefined)
                        shape.rigidBody.setRotation(
                            (info.output.pose.rotation * Math.PI) / 180,
                            true,
                        );

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

                    // Set the collision filter based on the matter settings.
                    shape.collider.setCollisionGroups(
                        getInteractionGroups(matter),
                    );

                    // Bodies whose position is set externally (by Placement or
                    // a static Place) become sensors: they still fire collision
                    // events, but the solver doesn't apply separation impulses
                    // that would fight the per-frame setTranslation. Without
                    // this, the solver pushes overlapping bodies apart every
                    // step, sync teleports them back, and Collision oscillates
                    // between start/end at frame rate.
                    shape.collider.setSensor(motion === undefined);
                }
                // No motion or matter? Remove it from the world so it doesn't mess with collisions.
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

        const factor = get(animationFactor);

        // Frozen world (animationFactor 0 / calm mode): finalize any deferred
        // moves so bodies stay where Placement put them, then skip simulation.
        if (factor <= 0) {
            for (const [shape, move] of this.sweepingBodies)
                shape.rigidBody.setTranslation(move.to, true);
            this.sweepingBodies.clear();
            return;
        }

        // Convert wall-clock elapsed to simulated elapsed. animationFactor
        // is an inverse-speed multiplier (4 = ¼ speed, 0.1 = 10× speed).
        // Cap the per-call delta so a long pause / hidden tab doesn't dump
        // huge time into the accumulator.
        this.accumulator += Math.min(elapsed / factor, 100);

        // Run as many fixed sub-steps as fit. Cap iterations so very slow
        // machines don't spiral; better to let simulated time fall behind
        // real time than feed huge variable steps to the engine, which
        // causes tunneling and missed collisions.
        const MAX_STEPS = 4;
        const steps = Math.min(
            Math.floor(this.accumulator / FIXED_STEP_MS),
            MAX_STEPS,
        );

        if (steps > 0) {
            // Decrement the accumulator BEFORE the step loop, not after.
            // world.step fires collision events that the Collision-stream
            // handler eventually lands in Evaluator.end(), which calls
            // physics.tick(0) "just in case" there are pending collisions to
            // surface. With a post-loop decrement, that reentrant tick(0) saw
            // the same accumulator value, computed the same `steps`, and
            // re-stepped — infinite recursion. Pre-decrementing means the
            // reentrant tick(0) sees the accumulator already drained for this
            // batch, computes steps=0, and returns cleanly.
            this.accumulator -= steps * FIXED_STEP_MS;
            // Drop remainder when we hit the cap so it doesn't grow forever.
            if (steps === MAX_STEPS) this.accumulator = 0;
            const events = this.getEvents(RAPIER);
            for (let i = 1; i <= steps; i++) {
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

const FIXED_STEP_MS = 16;

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
                .setCollisionGroups(getInteractionGroups(matter))
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

    /** Convert the engine position into stage Place values. */
    getPlace() {
        const position = this.rigidBody.translation();
        const angle = this.rigidBody.rotation();
        return {
            x: position.x / PX_PER_METER - this.width / 2,
            y: -position.y / PX_PER_METER - this.height / 2,
            angle:
                (isNaN(angle) || angle === Infinity || angle === -Infinity
                    ? 0
                    : angle * 180) / Math.PI,
        };
    }
}

/** Abstract away the interaction-group packing for output bodies. */
function getInteractionGroups(matter: Matter | undefined) {
    // Rapier packs membership in the high 16 bits, the filter mask in the low 16.
    if (matter) {
        const filter =
            (matter.text ? TextCategory : 0) |
            (matter.shapes ? ShapeCategory : 0);
        return (TextCategory << 16) | filter;
    }
    // No matter: member of Text, but collides with nothing (empty filter).
    return TextCategory << 16;
}
