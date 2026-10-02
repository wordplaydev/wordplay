import type * as RAPIER from '@dimforge/rapier2d-compat';
import { PX_PER_METER } from '#output/Output/outputToCSS.ts';
import { FIXED_STEP_MS } from '#output/physics/Physics.ts';
import {
    glyphColliderDesc,
    outermostLoops,
    outlineMesh,
    polygonsOf,
    type OutlineLoops,
    type OutlineMesh,
} from '#output/physics/glyphOutline.ts';
import earcut from 'earcut';
import { create } from 'fontkit';
import { readFileSync } from 'node:fs';
import { flattenGlyphLoops } from '#basis/faces/shapeText.ts';
import { must } from '#util/nullable.ts';
import { beforeAll, expect, test } from 'vitest';
import { getRapier, loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A glyph outline collides by its ink, not by the rectangle around it.
 *
 * Loops are injected rather than traced from a font: getContourFont returns
 * undefined with no window, so node can never fetch one. That is exactly why
 * outlineMesh and glyphColliderDesc are pure — the shape decision is testable
 * here, and only the font fetch needs a browser.
 */

/** The triangle mesh for one glyph's loops. */
function mesh(loops: OutlineLoops, emoji = false): OutlineMesh {
    return must(outlineMesh([{ loops, emoji }], earcut), 'a mesh');
}

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
 *  its bottom, so the baseline is the full height below the top — which puts
 *  it half a box below center and the top of the ink half a box above it.
 *
 *  Engine y is negated stage y, so it grows downward and gravity is positive. */
function glyphWorld(loops: OutlineLoops, size: number, emoji = false) {
    const rapier = getRapier();
    const world = new rapier.World({ x: 0, y: 2000 });
    world.lengthUnit = PX_PER_METER;
    world.timestep = FIXED_STEP_MS / 1000;
    const desc = glyphColliderDesc(
        rapier,
        mesh(loops, emoji),
        size,
        size,
        size,
        size,
    );
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

test('a glyph collides as solid triangles, not as one hull or a polyline', () => {
    const rapier = getRapier();
    // Triangles are what make a concave glyph collidable while it is also
    // moving: a polyline has no interior, so two of them never touch, and a
    // pile of letters would fall through itself.
    const desc = glyphColliderDesc(rapier, mesh(BowlLoops), 1, 1, 1, 1);
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

/** Points every `step` em along a polygon's edges, as `flattenGlyphLoops`
 *  samples a real outline. */
function sampled(
    corners: [number, number][],
    step: number,
): OutlineLoops[number] {
    const points: OutlineLoops[number] = [];
    corners.forEach(([ax, ay], index) => {
        const [bx, by] = must(
            corners[(index + 1) % corners.length],
            'a corner',
        );
        const count = Math.max(
            1,
            Math.round(Math.hypot(bx - ax, by - ay) / step),
        );
        for (let k = 0; k < count; k++)
            points.push({
                x: ax + ((bx - ax) * k) / count,
                y: ay + ((by - ay) * k) / count,
            });
    });
    return points;
}

/** An `m`: a flat top over three legs, so its parts meet in seams below that
 *  top. Ink is 1em square. Sampled every 1/64em like a real outline: with only
 *  its twelve corners, the triangulation's one seam into the top-left corner is
 *  exactly where the box starts, which no traced glyph ever presents. */
const ArchLoops: OutlineLoops = [
    sampled(
        [
            [0, 0],
            [0.2, 0],
            [0.2, 0.6],
            [0.4, 0.6],
            [0.4, 0],
            [0.6, 0],
            [0.6, 0.6],
            [0.8, 0.6],
            [0.8, 0],
            [1, 0],
            [1, 1],
            [0, 1],
        ],
        1 / 64,
    ),
];

test('a box slides across a glyph without catching on the seams between its parts', () => {
    // Without FIX_INTERNAL_EDGES, a box at this speed stopped dead at the first
    // seam and never crossed; a ball hopped ~4px there and lost speed.
    const rapier = getRapier();
    const world = new rapier.World({ x: 0, y: 390.6 });
    world.lengthUnit = PX_PER_METER;
    world.timestep = FIXED_STEP_MS / 1000;
    const desc = glyphColliderDesc(rapier, mesh(ArchLoops), 4, 4, 4, 4);
    if (desc === undefined) throw new Error('expected a collider');
    // Frictionless throughout, so the only thing that can slow the box is
    // the shape it slides on.
    world.createCollider(
        desc.setFriction(0),
        world.createRigidBody(rapier.RigidBodyDesc.fixed()),
    );
    // At 4m the top of the ink is 2m above center.
    const top = -2 * PX_PER_METER;
    const half = 16;
    const speed = 200;
    const box = world.createRigidBody(
        rapier.RigidBodyDesc.dynamic()
            .setTranslation(-1.8 * PX_PER_METER, top - half - 0.5)
            .setLinvel(speed, 0)
            .lockRotations(),
    );
    world.createCollider(
        rapier.ColliderDesc.cuboid(half, half).setFriction(0),
        box,
    );

    let slowest = speed;
    for (let step = 0; step < 120; step++) {
        world.step();
        if (box.translation().x > 1.8 * PX_PER_METER) break;
        slowest = Math.min(slowest, box.linvel().x);
    }

    expect(box.translation().x).toBeGreaterThan(1.8 * PX_PER_METER);
    expect(slowest).toBeGreaterThan(speed * 0.95);
    // And it stays on the top rather than hopping over each seam.
    expect(box.translation().y).toBeCloseTo(top - half, 0);
});

test('a counter is empty, so what is inside an O stays inside', () => {
    const { rapier, world } = glyphWorld(RingLoops, 4);
    const collider = must(world.colliders.getAll()[0], 'the glyph collider');
    // The counter spans -1m..1m about the centre; the ink is the band around it.
    expect(collider.containsPoint({ x: 0, y: 0 })).toBe(false);
    expect(collider.containsPoint({ x: 0, y: -1.5 * PX_PER_METER })).toBe(true);
    expect(collider.containsPoint({ x: 0, y: -3 * PX_PER_METER })).toBe(false);
    // A ball let go in the middle falls to the counter's floor, 1m below
    // centre, and rests there rather than being pushed out through the ink.
    const radius = 0.3 * PX_PER_METER;
    const rest = settle(rapier, world, 0, 0, radius);
    expect(rest.y).toBeCloseTo(1 * PX_PER_METER - radius, -1);
    expect(Math.abs(rest.x)).toBeLessThan(1 * PX_PER_METER);
});

/** A ring with a dot in its counter, like a target or a `⊙`. */
const DotInRingLoops: OutlineLoops = [
    ...RingLoops,
    [
        { x: 0.45, y: 0.45 },
        { x: 0.55, y: 0.45 },
        { x: 0.55, y: 0.55 },
        { x: 0.45, y: 0.55 },
    ],
];

test('loops are solid or empty by how deeply they are nested', () => {
    // The outer square is solid with the counter cut out of it; the dot inside
    // the counter is solid again.
    const polygons = polygonsOf(DotInRingLoops);
    expect(polygons).toEqual([
        { outer: DotInRingLoops[0], holes: [DotInRingLoops[1]] },
        { outer: DotInRingLoops[2], holes: [] },
    ]);
    const collider = must(
        glyphWorld(DotInRingLoops, 4).world.colliders.getAll()[0],
        'the glyph collider',
    );
    expect(collider.containsPoint({ x: 0, y: 0 })).toBe(true);
    expect(collider.containsPoint({ x: 0.7 * PX_PER_METER, y: 0 })).toBe(false);
});

test('an emoji keeps its silhouette, since the picture on stage is solid', () => {
    // The monochrome face draws a smiley as a ring around its eyes; the color
    // face paints it as one yellow disc, which is what things should bump.
    expect(outermostLoops(RingLoops)).toEqual([RingLoops[0]]);
    const collider = must(
        glyphWorld(RingLoops, 4, true).world.colliders.getAll()[0],
        'the emoji collider',
    );
    expect(collider.containsPoint({ x: 0, y: 0 })).toBe(true);
});

test('loops side by side are all outermost', () => {
    const square = (x: number) => [
        { x, y: 0 },
        { x: x + 1, y: 0 },
        { x: x + 1, y: 1 },
        { x, y: 1 },
    ];
    expect(outermostLoops([square(0), square(2)])).toHaveLength(2);
    expect(polygonsOf([square(0), square(2)])).toHaveLength(2);
});

test('an outline with nothing in it builds no mesh', () => {
    expect(outlineMesh([], earcut)).toBeUndefined();
    expect(
        outlineMesh([{ loops: [[{ x: 0, y: 0 }]], emoji: false }], earcut),
    ).toBeUndefined();
});

test.each([
    ['Merriweather', 'static/fonts/Merriweather/Merriweather-all.ttf'],
    ['Titan One', 'static/fonts/TitanOne/TitanOne-400.ttf'],
])('every %s letter builds a collider', (_, path) => {
    // Hand-drawn loops never reach the collider as sparse as they are written:
    // a traced loop is sampled every 1/64em and repeats its first point, and
    // straight runs of samples are what a triangulator turns into zero-area
    // parts that the engine cannot build. Only real glyphs exercise that.
    const rapier = getRapier();
    const file = create(readFileSync(path));
    const font = 'fonts' in file ? must(file.fonts[0], 'a font') : file;
    const world = new rapier.World({ x: 0, y: 0 });
    for (const letter of 'ABCDEGOPQRSUabdeghopq8@&') {
        const glyph = must(font.layout(letter).glyphs[0], 'a glyph');
        const loops = flattenGlyphLoops(
            glyph.path.commands,
            1 / font.unitsPerEm,
            1 / 64,
            0,
            0,
        );
        const desc = must(
            glyphColliderDesc(rapier, mesh(loops), 14, 10, 14, 10),
            `${letter}'s collider`,
        );
        expect(() =>
            world.createCollider(
                desc,
                world.createRigidBody(rapier.RigidBodyDesc.fixed()),
            ),
        ).not.toThrow();
    }
});

test('periods bouncing inside a real O stay inside it', () => {
    // The feature the empty counter exists for. At ordinary speeds; a stroke
    // thinner than a body travels in a step can still be crossed, since the
    // engine's sweep does not reach compound shapes.
    const rapier = getRapier();
    const file = create(
        readFileSync('static/fonts/Merriweather/Merriweather-all.ttf'),
    );
    const font = 'fonts' in file ? must(file.fonts[0], 'a font') : file;
    const glyph = must(font.layout('O').glyphs[0], 'an O');
    const ring = mesh(
        flattenGlyphLoops(
            glyph.path.commands,
            1 / font.unitsPerEm,
            1 / 64,
            0,
            0,
        ),
    );
    const size = 20;
    const world = new rapier.World({ x: 0, y: 0 });
    world.lengthUnit = PX_PER_METER;
    world.timestep = FIXED_STEP_MS / 1000;
    world.createCollider(
        must(
            glyphColliderDesc(
                rapier,
                ring,
                size,
                0.716 * size,
                0.762 * size,
                0.751 * size,
            ),
            'the O',
        ).setFriction(0),
        world.createRigidBody(rapier.RigidBodyDesc.fixed()),
    );
    const dots = Array.from({ length: 20 }, (_, index) => {
        const angle = (index / 20) * Math.PI * 2;
        const body = world.createRigidBody(
            rapier.RigidBodyDesc.dynamic()
                .setTranslation(Math.cos(angle) * 60, Math.sin(angle) * 60)
                .setLinvel(
                    Math.cos(angle * 3) * 8 * PX_PER_METER,
                    Math.sin(angle * 3) * 8 * PX_PER_METER,
                ),
        );
        world.createCollider(
            rapier.ColliderDesc.ball(10).setFriction(0).setRestitution(1),
            body,
        );
        return body;
    });
    for (let step = 0; step < 1200; step++) world.step();
    // The counter spans about ±0.23em across and ±0.33em up and down.
    for (const dot of dots) {
        const { x, y } = dot.translation();
        expect(Math.abs(x)).toBeLessThan(0.23 * size * PX_PER_METER);
        expect(Math.abs(y)).toBeLessThan(0.34 * size * PX_PER_METER);
    }
});
