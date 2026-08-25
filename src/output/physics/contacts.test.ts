import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import type { OutputInfo, OutputInfoSet } from '@output/animation/Animator';
import { onContacts, type Contact } from '@output/Cues/contacts';
import Phrase from '@output/Output/Phrase';
import { toStage } from '@output/Output/Stage';
import { createPlace } from '@output/Place/Place';
import Physics, { FIXED_STEP_MS } from '@output/physics/Physics';
import RenderContext from '@output/RenderContext';
import Evaluator from '@runtime/Evaluator';
import { beforeAll, expect, test, vi } from 'vitest';
import { loadRapier, onRapierLoaded } from './rapierLoader';

/**
 * Audible cues otherwise name re-evaluations, so a program that never evaluates
 * `Collision()` bounced in silence: `report()` hands every contact to the
 * Collision streams, and there are none. Contacts are reported to the cue layer
 * independently of that, which is the whole of this feature — so the program
 * below has no `Collision()` in it, on purpose.
 *
 * Only a Phrase or Group can be given a moving body (matter is read off those
 * two alone, and a Shape has no place input for a Motion to drive), so this
 * drops a Phrase, which needs a canvas — mocked below, since these run in node.
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

/** A phrase falling under a Motion onto a barrier, and the scene entries
 *  Animator.layout would produce for it and the stage. */
function fallingPhrase() {
    const source = new Source(
        'test',
        `Stage([
    Phrase('a' place: Motion(Place(0m 5m)) matter: Matter(bounciness: 0.3))
    Shape(Rectangle(-5m -2m 5m -4m))
])`,
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
    // A Motion is what makes a body simulated rather than position-driven,
    // which is also why Hiragana's letters fall: matter alone is kinematic.
    const place = phrase.place ?? createPlace(evaluator, 0, 5, 0);
    const info: OutputInfo = {
        output: phrase,
        global: place,
        local: place,
        rotation: undefined,
        width: 1,
        height: 1,
        parents: [stage],
        context,
    };
    // The stage's own entry, which is where sync reads gravity from: without it
    // the world has none and nothing ever falls.
    const stageInfo: OutputInfo = {
        output: stage,
        global: place,
        local: place,
        rotation: undefined,
        width: 10,
        height: 10,
        parents: [],
        context,
    };
    // The phrase first, so its world exists by the time the stage entry sets
    // the world's gravity — sync only writes gravity to worlds that are there.
    const scene: OutputInfoSet = new Map([
        [phrase.getName(), info],
        [stage.getName(), stageInfo],
    ]);
    return { evaluator, phrase, stage, scene };
}

/** Drop it, collecting whatever contacts reach the cue layer. */
function drop(steps: number) {
    const { evaluator, stage, scene } = fallingPhrase();
    const physics = new Physics(evaluator);
    const heard: Contact[] = [];
    const stop = onContacts(evaluator, (contacts) => heard.push(...contacts));
    physics.sync(stage, scene, new Map());
    for (let step = 0; step < steps; step++) physics.tick(FIXED_STEP_MS);
    stop();
    physics.stop();
    evaluator.stop();
    return heard;
}

test('a contact is reported though nothing is watching for one', () => {
    // Two seconds: long enough to fall two meters and land.
    const heard = drop(125);
    expect(heard.length).toBeGreaterThan(0);
    // A landing is a real hit, not a graze.
    expect(
        Math.max(...heard.map((contact) => contact.strength)),
    ).toBeGreaterThan(0.1);
});

test('every reported contact carries a usable strength', () => {
    const heard = drop(125);
    expect(heard.length).toBeGreaterThan(0);
    for (const contact of heard) {
        expect(contact.strength).toBeGreaterThan(0);
        expect(contact.strength).toBeLessThanOrEqual(1);
    }
});

test('a body at rest stops reporting, so a settled stage is silent', () => {
    // Whatever is heard is heard while it lands. A resting body's support
    // impulse is not zero, so without the strength threshold this would report
    // forever, and twice the time would mean more contacts.
    const landed = drop(250).length;
    expect(landed).toBeGreaterThan(0);
    expect(drop(500).length).toBe(landed);
});
