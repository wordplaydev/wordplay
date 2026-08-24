import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import type { OutputInfo, OutputInfoSet } from '@output/animation/Animator';
import RenderContext from '@output/RenderContext';
import type Stage from '@output/Output/Stage';
import { toStage } from '@output/Output/Stage';
import Physics from '@output/physics/Physics';
import Evaluator from '@runtime/Evaluator';
import { beforeAll, expect, test } from 'vitest';
import { loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A Collision watching a name is what puts an output in the physical world
 * (#548). A Shape directly on the Stage is already in that world as a barrier,
 * so watching its name must not build a second body for it: two colliders under
 * one name report every touch twice, and their begin/end events interleave, so
 * the stream can read ø while the two things are still touching. FootBall has
 * exactly this shape — Collision('ball' 'net') beside Shape(… name: 'net').
 *
 * Shape.getLayout is pure geometry, so a shapes-only stage is the one scene
 * Physics.sync can be handed in node; a Phrase needs a DOM to measure.
 */

beforeAll(async () => {
    loadRapier();
    await new Promise<void>((resolve) => onRapierLoaded(resolve));
});

/** Evaluate a program and hand back its stage and a Physics to sync with it. */
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

/** The scene entries Animator.layout would produce for the stage's shapes:
 *  top-level output whose parent is the Stage itself. */
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

test('watching a named Shape does not add a second body for it', () => {
    const { stage, physics } = stageAndPhysics(`
hit: Collision('ball' 'net')
Stage([Shape(Rectangle(-5m 1m 5m -1m) name: 'net')])
`);

    expect(stage.getShapes()).toHaveLength(1);
    physics.sync(stage, shapeScene(stage), new Map());

    // The barrier stays the only thing in the world under that name.
    expect(physics.getOutputBody('net')).toBeUndefined();
    const worlds = Array.from(physics.worldsByZ.values());
    expect(worlds).toHaveLength(1);
    expect(worlds[0].colliders.len()).toBe(1);
});
