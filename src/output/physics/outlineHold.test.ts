import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import Fonts from '#basis/faces/Fonts.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Source from '#nodes/Source.ts';
import type { OutputInfo, OutputInfoSet } from '#output/animation/Animator.ts';
import Phrase from '#output/Output/Phrase.ts';
import { toStage } from '#output/Output/Stage.ts';
import { createPlace } from '#output/Place/Place.ts';
import { glyphOutlinesGeneration } from '#output/physics/glyphOutline.ts';
import Physics, {
    FIXED_STEP_MS,
    OutlineHoldLimitMs,
    type OutlineStatus,
} from '#output/physics/Physics.ts';
import RenderContext from '#output/RenderContext.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { get } from 'svelte/store';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import { loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * A body that asked to collide by its outline used to start falling with its
 * bounding box, so on a slow connection everything landed on the box before
 * the outline arrived. Physics now holds until the outline is resolved, and
 * only for bodies that asked. A Phrase needs a canvas to measure, mocked here
 * since this runs in node, where an outline load resolves to nothing — but not
 * synchronously, which is the window this checks. A face's loading state is set
 * by hand on the shared FontManager, since node has no FontFace.
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

/** Faces whose loading state a test set by hand, cleared after each. */
const faces: string[] = [];
function setFace(face: string, state: 'requested' | 'failed') {
    faces.push(face);
    Fonts.facesLoaded.set(face, state);
}
afterEach(() => {
    for (const face of faces.splice(0)) Fonts.facesLoaded.delete(face);
});

/** A falling phrase in its own world, with what it takes to sync and step it.
 *  The engine's y points down, so falling makes it larger. */
function fall(text: string, face: string, outline: boolean) {
    const source = new Source(
        'test',
        `Stage([Phrase('${text}' face: '${face}' place: Motion(Place(0m 5m)) matter: Matter(outline: ${outline ? '⊤' : '⊥'}))] gravity: 9.8m/s^2)`,
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
    const statuses: OutlineStatus[] = [];
    physics.observeOutlineStatus((status) => statuses.push(status));
    const height = () =>
        physics.getOutputBody(phrase.getName())?.rigidBody.translation().y ??
        NaN;
    return {
        physics,
        statuses,
        height,
        sync: () => physics.sync(stage, scene, new Map()),
        step: (steps: number) => {
            for (let step = 0; step < steps; step++)
                physics.tick(FIXED_STEP_MS);
        },
        stop: () => {
            physics.stop();
            evaluator.stop();
        },
    };
}

/** Wait for every outline asked for so far to resolve. */
async function outlinesResolved(generation: number) {
    await vi.waitFor(() =>
        expect(get(glyphOutlinesGeneration)).toBeGreaterThan(generation),
    );
}

test('a body waits for its outline before it falls, and then falls as if it never waited', async () => {
    const held = fall('W', 'Noto Sans', true);
    const generation = get(glyphOutlinesGeneration);
    held.sync();
    const start = held.height();
    held.step(30);
    // Still waiting for the outline, so it hasn't moved.
    expect(held.height()).toBe(start);
    expect(held.statuses).toEqual([undefined, 'waiting']);

    // The outline resolves, which re-syncs the scene as StageView does.
    await outlinesResolved(generation);
    held.sync();
    held.step(30);

    // The time spent waiting isn't owed: it falls exactly as far as a body
    // that never waited does in the same thirty steps.
    const free = fall('W', 'Noto Sans', false);
    free.sync();
    free.step(30);
    expect(held.height() - start).toBeCloseTo(free.height() - start, 6);
    expect(held.statuses.at(-1)).toBe(undefined);

    held.stop();
    free.stop();
});

test('a body that did not ask for an outline never waits for its face', () => {
    setFace('Titan One', 'requested');
    const world = fall('W', 'Titan One', false);
    world.sync();
    const start = world.height();
    world.step(30);
    expect(world.height()).toBeGreaterThan(start);
    expect(world.statuses).toEqual([undefined]);
    world.stop();
});

test('a face giving up releases the hold without another sync', async () => {
    setFace('Titan One', 'requested');
    const world = fall('W', 'Titan One', true);
    const generation = get(glyphOutlinesGeneration);
    world.sync();
    const start = world.height();
    // The outline resolves but nothing syncs, as on a stage that isn't moving.
    await outlinesResolved(generation);
    world.step(10);
    expect(world.height()).toBe(start);
    Fonts.facesLoaded.set('Titan One', 'failed');
    world.step(10);
    expect(world.height()).toBeGreaterThan(start);
    world.stop();
});

test('a hold that runs too long gives up and collides by boxes', () => {
    setFace('Titan One', 'requested');
    const world = fall('W', 'Titan One', true);
    world.sync();
    const start = world.height();
    world.step(Math.ceil(OutlineHoldLimitMs / FIXED_STEP_MS) - 1);
    expect(world.height()).toBe(start);
    world.step(30);
    expect(world.height()).toBeGreaterThan(start);
    expect(world.statuses.at(-1)).toBe('boxes');
    // A later sync doesn't hold it again while the same face is still loading.
    world.sync();
    const resumed = world.height();
    world.step(10);
    expect(world.height()).toBeGreaterThan(resumed);
    world.stop();
});
