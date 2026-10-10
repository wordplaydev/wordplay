import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { Free } from '#output/Arrangement/Free.ts';
import { Grid } from '#output/Arrangement/Grid.ts';
import { Row } from '#output/Arrangement/Row.ts';
import { Stack } from '#output/Arrangement/Stack.ts';
import { toAura } from '#output/Aura/Aura.ts';
import { toNote } from '#output/Music/Note.ts';
import { toTrack } from '#output/Music/Track.ts';
import Music from '#output/Music/Music.ts';
import Group from '#output/Output/Group.ts';
import Phrase from '#output/Output/Phrase.ts';
import Say, { toSay } from '#output/Output/Say.ts';
import Stage, { NameGenerator } from '#output/Output/Stage.ts';
import {
    toArrangement,
    toOutput,
    toOutputList,
} from '#output/Output/toOutput.ts';
import { toPlace } from '#output/Place/Place.ts';
import { toVelocity } from '#output/physics/Velocity.ts';
import Evaluator from '#runtime/Evaluator.ts';
import { afterEach, expect, test } from 'vitest';

/**
 * The converters that turn a program's values into output, each asked directly. Most are reached
 * only through `toStage`, where a field that silently came back undefined just renders a default.
 */

const evaluators: Evaluator[] = [];
afterEach(() => {
    for (const evaluator of evaluators.splice(0)) evaluator.stop();
});

function evaluate(code: string) {
    const project = Project.make(
        null,
        'test',
        new Source('test', code),
        [],
        DefaultLocale,
    );
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    evaluators.push(evaluator);
    return { project, evaluator, value: evaluator.getInitialValue() };
}

test('a place carries its coordinates in meters and its rotation in degrees', () => {
    const place = toPlace(evaluate('Place(1m 2m 3m 45°)').value);
    expect([place?.x, place?.y, place?.z, place?.rotation]).toEqual([
        1, 2, 3, 45,
    ]);
});

test('a place defaults its unspecified coordinates to zero', () => {
    const place = toPlace(evaluate('Place(1m)').value);
    expect([place?.x, place?.y, place?.z]).toEqual([1, 0, 0]);
});

test('a velocity carries its components and angular speed', () => {
    const velocity = toVelocity(evaluate('Velocity(1m/s 2m/s 90°/s)').value);
    expect([velocity?.x, velocity?.y, velocity?.angle]).toEqual([1, 2, 90]);
});

test('a velocity may leave its components unspecified', () => {
    const velocity = toVelocity(evaluate('Velocity()').value);
    expect(velocity).toBeDefined();
    expect([velocity?.x, velocity?.y, velocity?.angle]).toEqual([
        undefined,
        undefined,
        undefined,
    ]);
});

test('an aura carries its color, blur, and offset', () => {
    const { project, value } = evaluate('Aura(Color(50% 50 90°) 1m 2m 3m)');
    const aura = toAura(project, value);
    expect(aura?.color?.toCSS()).toBeDefined();
    expect([aura?.blur, aura?.offsetX, aura?.offsetY]).toEqual([1, 2, 3]);
});

test('only an aura converts to an aura', () => {
    const { project, value } = evaluate('Place(1m 2m)');
    expect(toAura(project, value)).toBeUndefined();
});

test.each([
    ['Row()', Row],
    ['Stack()', Stack],
    ['Grid(2 2)', Grid],
    ['Free()', Free],
])('%s converts to its arrangement', (code, kind) => {
    const { project, value } = evaluate(code);
    expect(toArrangement(project, value)).toBeInstanceOf(kind);
});

test('a non-arrangement is no arrangement', () => {
    const { project, value } = evaluate('Place(1m 2m)');
    expect(toArrangement(project, value)).toBeUndefined();
});

test('a note carries its degree and duration', () => {
    const note = toNote(evaluate('Note(3 2beats)').value);
    expect(note?.beats).toBe(2);
    expect(note?.volume).toBeDefined();
});

test('a track holds one entry per note', () => {
    const { project, value } = evaluate('Track([1 3 5 ø])');
    expect(toTrack(project, value)?.notes).toHaveLength(4);
});

test('say carries its text', () => {
    const { project, value } = evaluate("Say('hello')");
    expect(toSay(project, value, new NameGenerator())?.text.text).toBe('hello');
});

test.each([
    ["Phrase('hi')", Phrase],
    ["Group(Row() [Phrase('hi')])", Group],
    ["Stage([Phrase('hi')])", Stage],
    ["Say('hi')", Say],
    ['Music(Track([1]))', Music],
])('%s is an output', (code, kind) => {
    const { evaluator, value } = evaluate(code);
    expect(toOutput(evaluator, value, new NameGenerator())).toBeInstanceOf(
        kind,
    );
});

test('a structure that is not output is no output', () => {
    const { evaluator, value } = evaluate('Place(1m 2m)');
    expect(toOutput(evaluator, value, new NameGenerator())).toBeUndefined();
});

test('an output list keeps none as a gap, and refuses anything else', () => {
    const gaps = evaluate("[Phrase('a') ø Phrase('b')]");
    expect(
        toOutputList(gaps.evaluator, gaps.value, new NameGenerator())?.map(
            (output) => output === null,
        ),
    ).toEqual([false, true, false]);
    const mixed = evaluate("[Phrase('a') 1]");
    expect(
        toOutputList(mixed.evaluator, mixed.value, new NameGenerator()),
    ).toBeUndefined();
});
