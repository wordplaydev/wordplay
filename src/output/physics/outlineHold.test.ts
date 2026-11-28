import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Source from '#nodes/Source.ts';
import type { OutputInfo, OutputInfoSet } from '#output/animation/Animator.ts';
import Phrase from '#output/Output/Phrase.ts';
import { toStage } from '#output/Output/Stage.ts';
import { createPlace } from '#output/Place/Place.ts';
import { glyphOutlinesGeneration } from '#output/physics/glyphOutline.ts';
import Physics, { FIXED_STEP_MS } from '#output/physics/Physics.ts';
import RenderContext from '#output/RenderContext.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { get } from 'svelte/store';
import { beforeAll, expect, test, vi } from 'vitest';
import { loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A body that asked to collide by its outline used to start falling with its
 * bounding box, so on a slow connection everything landed on the box before
 * the outline arrived. Physics now holds until the outline is resolved. A
 * Phrase needs a canvas to measure, mocked here since this runs in node, where
 * an outline load resolves to nothing — but not synchronously, which is the
 * window this checks.
 */

vi.mock('#output/Output/getTextMetrics.ts', () => ({
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

test('a body waits for its outline before it falls', async () => {
    const source = new Source(
        'test',
        `Stage([Phrase('W' place: Motion(Place(0m 5m)) matter: Matter(outline: ⊤))] gravity: 9.8m/s^2)`,
    );
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
    const phrase = stage.content[0];
    if (!(phrase instanceof Phrase)) throw new Error('expected a phrase');

    const context = new RenderContext(
        'Noto Sans',
        12,
        DefaultLocales,
        new Set(),
        1,
        'horizontal-tb',
    );
    const place = phrase.place ?? createPlace(evaluator, 0, 5, 0);
    const entry = (
        output: Phrase | typeof stage,
        parents: OutputInfo['parents'],
    ) => ({
        output,
        global: place,
        local: place,
        rotation: undefined,
        width: 1,
        height: 1,
        parents,
        context,
    });
    const scene: OutputInfoSet = new Map([
        [phrase.getName(), entry(phrase, [stage])],
        [stage.getName(), entry(stage, [])],
    ]);

    const physics = new Physics(evaluator);
    const height = () =>
        physics.getOutputBody(phrase.getName())?.rigidBody.translation().y;

    const generation = get(glyphOutlinesGeneration);
    physics.sync(stage, scene, new Map());
    const start = height();
    for (let step = 0; step < 30; step++) physics.tick(FIXED_STEP_MS);
    // Still waiting for the outline, so it hasn't moved.
    expect(height()).toBe(start);

    // The outline resolves, which re-syncs the scene as StageView does.
    await vi.waitFor(() =>
        expect(get(glyphOutlinesGeneration)).toBeGreaterThan(generation),
    );
    physics.sync(stage, scene, new Map());
    const released = height();
    for (let step = 0; step < 30; step++) physics.tick(FIXED_STEP_MS);
    expect(height()).not.toBe(released);

    physics.stop();
    evaluator.stop();
});
