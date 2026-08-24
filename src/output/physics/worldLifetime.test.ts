import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import type { OutputInfo, OutputInfoSet } from '@output/animation/Animator';
import Phrase from '@output/Output/Phrase';
import { toStage } from '@output/Output/Stage';
import { createPlace } from '@output/Place/Place';
import Physics, { FIXED_STEP_MS } from '@output/physics/Physics';
import RenderContext from '@output/RenderContext';
import Evaluator from '@runtime/Evaluator';
import { beforeAll, expect, test, vi } from 'vitest';
import { loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A world is freed as soon as it holds no bodies, so replacing the only body at
 * a depth used to free the world out from under its replacement (#1315): sync()
 * resolved the world before removing the old body, and removeOutputBody both
 * freed it and dropped it from worldsByZ. Building into the freed world throws
 * outright ("Cannot read properties of undefined (reading 'createRigidBody')"),
 * so a lone Phrase with Matter — a score, a timer, a growing word — crashed the
 * frame the first time its text changed size. Anything else at that depth, a
 * second output or a Shape barrier, kept the world full and hid it.
 *
 * Only a Phrase or Group can reach that path: matter is read off those two
 * alone, a watched Shape is deliberately left to its barrier body, and a Shape
 * has no place input for a Motion to drive. So this measures a Phrase, which
 * needs a canvas — mocked below, since these tests run in node.
 */

vi.mock('@output/Output/getTextMetrics', () => ({
    default: () => ({
        width: 10,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
        fontBoundingBoxAscent: 10,
        fontBoundingBoxDescent: 3,
    }),
}));

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

test('replacing the only body at a depth keeps its world alive', () => {
    const { evaluator, stage, physics } = stageAndPhysics(
        `Stage([Phrase('a' matter: Matter())])`,
    );

    const phrase = stage.content[0];
    if (!(phrase instanceof Phrase)) throw new Error('expected a phrase');
    const name = phrase.getName();

    const context = new RenderContext(
        'Noto Sans',
        12,
        DefaultLocales,
        new Set(),
        1,
        'horizontal-tb',
    );
    const place = createPlace(evaluator, 0, 0, 0);

    /** The scene entry Animator.layout would produce, at the given size. */
    const scene = (width: number, height: number): OutputInfoSet => {
        const info: OutputInfo = {
            output: phrase,
            global: place,
            local: place,
            rotation: undefined,
            width,
            height,
            parents: [stage],
            context,
        };
        return new Map([[name, info]]);
    };

    // The phrase is the only thing on stage, so its world holds only its body.
    physics.sync(stage, scene(1, 1), new Map());
    expect(physics.worldsByZ.get(0)?.bodies.len()).toBe(1);

    // Its size changes, so sync replaces the body.
    physics.sync(stage, scene(2, 1), new Map());

    // The world it was replaced in is still the world the simulation steps.
    const world = physics.worldsByZ.get(0);
    expect(world).toBeDefined();
    expect(physics.worldsByZ.size).toBe(1);
    expect(physics.getOutputBody(name)?.world).toBe(world);
    // And the body it replaced is gone, rather than both lingering.
    expect(world?.bodies.len()).toBe(1);

    // Stepping over the replacement is safe.
    expect(() => physics.tick(FIXED_STEP_MS)).not.toThrow();

    evaluator.stop();
});
