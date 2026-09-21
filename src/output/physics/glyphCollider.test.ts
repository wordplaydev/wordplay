import type * as RAPIER from '@dimforge/rapier2d-compat';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { FIXED_STEP_MS } from '@output/physics/Physics';
import {
    glyphColliderDesc,
    type OutlineLoops,
} from '@output/physics/glyphOutline';
import { must } from '@util/nullable';
import { beforeAll, expect, test } from 'vitest';
import { getRapier, loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A glyph outline collides by its ink, not by the rectangle around it.
 *
 * Loops are injected rather than traced from a font: getContourFont returns
 * undefined with no window, so node can never fetch one. That is exactly why
 * glyphColliderDesc is a pure function of loops — the shape decision is
 * testable here, and only the font fetch needs a browser.
 */

beforeAll(async () => {
    loadRapier();
    await new Promise<void>((resolve) => onRapierLoaded(resolve));
});

/** A U-shaped loop, in em, y-up from the baseline: two uprights joined by a
 *  floor, with an open bowl between them. Ink is 1em wide and 1em tall. */
const BowlLoops: OutlineLoops = [
    [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0.75, y: 1 },
        { x: 0.75, y: 0.25 },
        { x: 0.25, y: 0.25 },
        { x: 0.25, y: 1 },
        { x: 0, y: 1 },
    ],
];

/** A square ring: an outer loop and a counter, like the bowl of an `o`. */
const RingLoops: OutlineLoops = [
    [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
    ],
    [
        { x: 0.25, y: 0.25 },
        { x: 0.25, y: 0.75 },
        { x: 0.75, y: 0.75 },
        { x: 0.75, y: 0.25 },
    ],
];

/** A world holding one fixed body with the given loops as its collider, at the
 *  given em size. The box is the ink exactly — 1em square with the baseline at
 *  its bottom, so ascent is the full height — which puts the baseline half a
 *  box below center and the top of the ink half a box above it.
 *
 *  Engine y is negated stage y, so it grows downward and gravity is positive. */
function glyphWorld(loops: OutlineLoops, size: number) {
    const rapier = getRapier();
    const world = new rapier.World({ x: 0, y: 2000 });
    world.lengthUnit = PX_PER_METER;
    world.timestep = FIXED_STEP_MS / 1000;
    const desc = glyphColliderDesc(rapier, loops, size, size, size, size);
    if (desc === undefined) throw new Error('expected a collider');
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed());
    world.createCollider(desc.setFriction(0.5), body);
    return { rapier, world };
}

/** Drop a ball from the given collider-local position and let it settle. */
function settle(
    rapier: typeof RAPIER,
    world: RAPIER.World,
    x: number,
    y: number,
    radius: number,
) {
    const body = world.createRigidBody(
        rapier.RigidBodyDesc.dynamic().setTranslation(x, y),
    );
    world.createCollider(rapier.ColliderDesc.ball(radius), body);
    for (let step = 0; step < 600; step++) world.step();
    return body.translation();
}

test('a glyph collides as a compound of convex parts, not as one hull', () => {
    const rapier = getRapier();
    // Convex parts are what make a concave glyph collidable while it is also
    // moving: a polyline has no interior, so two of them never touch, and a
    // pile of letters would fall through itself.
    const desc = glyphColliderDesc(rapier, BowlLoops, 1, 1, 1, 1);
    if (desc === undefined) throw new Error('expected a collider');
    const world = new rapier.World({ x: 0, y: 0 });
    const collider = world.createCollider(
        desc,
        world.createRigidBody(rapier.RigidBodyDesc.fixed()),
    );
    expect(collider.shapeType()).toBe(rapier.ShapeType.Compound);
});

test('a ball settles inside the bowl rather than on its rim', () => {
    // At 4m the ink is 4m square, so the rim (1em up) is 2m above center at
    // engine y = -128, and the bowl's floor (0.25em up) is 1m below it at +64.
    const { rapier, world } = glyphWorld(BowlLoops, 4);
    const radius = 0.3 * PX_PER_METER;
    const rest = settle(rapier, world, 0, -6 * PX_PER_METER, radius);
    const rim = -2 * PX_PER_METER;
    const bowl = 1 * PX_PER_METER;
    // Past the rim is the whole point: a bounding box or a convex hull would
    // hold it there, which is the "floating above the hook" this fixes.
    expect(rest.y).toBeGreaterThan(rim);
    expect(rest.y).toBeCloseTo(bowl - radius, -1);
    // And between the uprights, which span -1m..1m. A flat bowl doesn't centre
    // what lands in it, so which upright it rolls to is not the claim.
    expect(Math.abs(rest.x)).toBeLessThan(1 * PX_PER_METER);
});

test('a counter is filled in, which is the approximation this makes', () => {
    // The decomposition voxelizes the region the outline bounds and never
    // carves the hole back out, at any tolerance — so the counter of an `o` is
    // solid and nothing can rest inside it. Pinned rather than left implicit,
    // because it is the one way a glyph collider is *less* faithful than the
    // outline, and the thing to re-measure if Rapier's decomposition changes.
    const { world } = glyphWorld(RingLoops, 4);
    const collider = must(world.colliders.getAll()[0], 'the glyph collider');
    // The counter spans -1m..1m about the centre.
    expect(collider.containsPoint({ x: 0, y: 0 })).toBe(true);
    // The ink and the space outside it are still right, which is what makes
    // the collider worth having.
    expect(collider.containsPoint({ x: 0, y: -1.5 * PX_PER_METER })).toBe(true);
    expect(collider.containsPoint({ x: 0, y: -3 * PX_PER_METER })).toBe(false);
});

test('an outline with nothing in it builds no collider', () => {
    const rapier = getRapier();
    expect(glyphColliderDesc(rapier, [], 1, 1, 1, 1)).toBeUndefined();
    expect(
        glyphColliderDesc(rapier, [[{ x: 0, y: 0 }]], 1, 1, 1, 1),
    ).toBeUndefined();
});
