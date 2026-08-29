import type * as RAPIER from '@dimforge/rapier2d-compat';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import type { OutputInfo, OutputInfoSet } from '@output/animation/Animator';
import RenderContext from '@output/RenderContext';
import type Stage from '@output/Output/Stage';
import { toStage } from '@output/Output/Stage';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import Physics, { FIXED_STEP_MS } from '@output/physics/Physics';
import Evaluator from '@runtime/Evaluator';
import { beforeAll, expect, test } from 'vitest';
import { getRapier, loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A Path barrier collides as a polyline rather than as its bounding box.
 *
 * That difference is the whole reason a path can be a hill: a hull or a box would fill in
 * the valley, so a ball would land on the rim instead of rolling into it. Shape.getLayout is
 * pure geometry, so a shapes-only stage is the one scene Physics.sync can be handed in node.
 */

beforeAll(async () => {
    loadRapier();
    await new Promise<void>((resolve) => onRapierLoaded(resolve));
});

function stageAndPhysics(code: string) {
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
    return { evaluator, stage, physics: new Physics(evaluator) };
}

function shapeScene(stage: Stage): OutputInfoSet {
    const context = new RenderContext(
        'Noto Sans',
        12,
        DefaultLocales,
        new Set(),
        1,
        'horizontal-tb',
    );
    const scene: OutputInfoSet = new Map();
    for (const shape of stage.getShapes()) {
        const layout = shape.getLayout();
        const place = shape.place;
        if (place === undefined) throw new Error('expected a place');
        const info: OutputInfo = {
            output: shape,
            global: place,
            local: place,
            rotation: undefined,
            width: layout.width,
            height: layout.height,
            parents: [stage],
            context,
        };
        scene.set(shape.getName(), info);
    }
    return scene;
}

/** The one collider a synced, single-shape stage put in the world. */
function onlyCollider(physics: Physics): RAPIER.Collider {
    const worlds = Array.from(physics.worldsByZ.values());
    expect(worlds).toHaveLength(1);
    expect(worlds[0].colliders.len()).toBe(1);
    return worlds[0].colliders.getAll()[0];
}

test('a Path barrier is a polyline, where the other forms are not', () => {
    const RAPIER = getRapier();

    const v = stageAndPhysics(
        `Stage([Shape(Path([Place(-4m 2m) Place(0m -2m) Place(4m 2m)]))])`,
    );
    v.physics.sync(v.stage, shapeScene(v.stage), new Map());
    expect(onlyCollider(v.physics).shape.type).toBe(RAPIER.ShapeType.Polyline);

    // The siblings keep the colliders they had: a hull would have filled the valley above in.
    const circle = stageAndPhysics(`Stage([Shape(Circle(2m))])`);
    circle.physics.sync(circle.stage, shapeScene(circle.stage), new Map());
    expect(onlyCollider(circle.physics).shape.type).toBe(RAPIER.ShapeType.Ball);

    const polygon = stageAndPhysics(`Stage([Shape(Polygon(2m 6))])`);
    polygon.physics.sync(polygon.stage, shapeScene(polygon.stage), new Map());
    expect(onlyCollider(polygon.physics).shape.type).toBe(
        RAPIER.ShapeType.ConvexPolygon,
    );
});

test('a ball dropped into a V comes to rest inside it, not on its rim', () => {
    const RAPIER = getRapier();
    // A V from (-4, 2) down to (0, -2) and back up to (4, 2). Its bounding box's top is
    // y = 2, so a box or a hull would stop a ball there; the polyline lets it reach the base.
    const { physics, stage } = stageAndPhysics(
        `Stage([Shape(Path([Place(-4m 2m) Place(0m -2m) Place(4m 2m)]))])`,
    );
    physics.sync(stage, shapeScene(stage), new Map());
    const world = Array.from(physics.worldsByZ.values())[0];

    const radius = 0.25 * PX_PER_METER;
    const ball = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic().setTranslation(
            0,
            // Engine y is negated stage y, so this drops from stage y = 6.
            -6 * PX_PER_METER,
        ),
    );
    world.createCollider(RAPIER.ColliderDesc.ball(radius), ball);
    world.gravity.y = 2000;
    world.timestep = FIXED_STEP_MS / 1000;
    for (let step = 0; step < 400; step++) world.step();

    const restingStageY = -ball.translation().y / PX_PER_METER;
    // Inside the V: far below the rim a box or a hull would have stopped it at, and held up
    // by the path rather than passing through it.
    expect(restingStageY).toBeLessThan(0);
    expect(restingStageY).toBeGreaterThan(-2);
    // Wedged between both walls rather than resting on one. The V drops 4m over 4m, so its
    // walls meet at a right angle, and a ball of radius r in a right-angled corner sits
    // r / sin(45°) above the vertex — which is only where it lands if both walls are there.
    expect(restingStageY).toBeCloseTo(-2 + 0.25 * Math.SQRT2, 2);
});

test('a path with fewer than two points bounds nothing', () => {
    // A dot is not a boundary, and Rapier would reject the degenerate polyline.
    const { physics, stage } = stageAndPhysics(
        `Stage([Shape(Path([Place(0m 0m)]))])`,
    );
    physics.sync(stage, shapeScene(stage), new Map());
    const worlds = Array.from(physics.worldsByZ.values());
    expect(worlds[0]?.colliders.len() ?? 0).toBe(0);
});
