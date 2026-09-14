import { expect, test } from 'vitest';
import { DB } from '@db/Database';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import Beat from '@input/Beat/Beat';
import StructureValue from '@values/StructureValue';
import ListValue from '@values/ListValue';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import BoolValue from '@values/BoolValue';
import type Value from '@values/Value';
import { must } from '@util/nullable';

function beatStream(code: string) {
    const project = Project.make(
        null,
        't',
        new Source('t', code),
        [],
        DefaultLocale,
    );
    // Reactive and playing: StreamValue.add() drops values while stepping.
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.start();
    const streams = evaluator.getBasisStreamsOfType(Beat);
    // The program evaluates a `Beat()`, so the evaluator has one of its streams.
    return { evaluator, stream: must(streams[0], 'a Beat stream') };
}

const event = {
    name: 'song',
    count: 7,
    tempo: 96,
    volume: 0.5,
    key: 2,
    scale: [0, 2, 4, 5, 7, 9, 11],
    instruments: ['piano', 'drums'],
    words: ['la'],
    parts: [
        {
            instrument: 'piano',
            sounding: true,
            degrees: [1, 3],
            pitch: [0, 4],
            volume: 0.75,
            pan: -0.5,
            scale: [0, 2, 4, 5, 7, 9, 11],
            key: 2,
            loop: true,
        },
        {
            instrument: 'drums',
            sounding: false,
            degrees: [],
            pitch: [],
            volume: 0,
            pan: 0,
            scale: [0, 2, 4, 5, 7, 9, 11],
            key: 0,
            loop: false,
        },
    ],
};

/** A value the program is expected to have produced, narrowed to its class so
 *  a missing field fails the test rather than being cast away. */
function valueOf<T extends Value>(
    value: Value | undefined,
    type: abstract new (...args: never[]) => T,
): T {
    expect(value).toBeInstanceOf(type);
    if (!(value instanceof type))
        throw new Error(
            `Expected a ${type.name}, got ${value?.constructor.name ?? 'nothing'}`,
        );
    return value;
}

/** A named field of a structure, narrowed to the class it must hold. */
function fieldOf<T extends Value>(
    structure: StructureValue,
    name: string,
    type: abstract new (...args: never[]) => T,
): T {
    return valueOf(structure.resolve(name), type);
}

test('a Downbeat carries the music state and one Part per track', () => {
    const { stream } = beatStream('Beat()');
    expect(stream).toBeDefined();
    stream.react(event);
    const down = valueOf(stream.latest(), StructureValue);

    const num = (n: string) => fieldOf(down, n, NumberValue).toNumber();
    expect(fieldOf(down, 'name', TextValue).text).toBe('song');
    expect(num('count')).toBe(7);
    expect(num('tempo')).toBe(96);
    // A gain is unitless 0-1, matching how `50%` evaluates.
    expect(num('volume')).toBe(0.5);
    expect(num('key')).toBe(2);
    expect(fieldOf(down, 'scale', ListValue).values.length).toBe(7);
    expect(fieldOf(down, 'instruments', ListValue).values.length).toBe(2);

    const parts = fieldOf(down, 'parts', ListValue);
    expect(parts.values.length).toBe(2);
    const first = valueOf(parts.values[0], StructureValue);
    expect(
        fieldOf(fieldOf(first, 'instrument', StructureValue), 'id', TextValue)
            .text,
    ).toBe('piano');
    expect(fieldOf(first, 'sounding', BoolValue).bool).toBe(true);
    expect(fieldOf(first, 'degrees', ListValue).values.length).toBe(2);
    expect(fieldOf(first, 'pitch', ListValue).values.length).toBe(2);
    expect(fieldOf(first, 'volume', NumberValue).toNumber()).toBe(0.75);
    expect(fieldOf(first, 'pan', NumberValue).toNumber()).toBe(-0.5);
    expect(fieldOf(first, 'key', NumberValue).toNumber()).toBe(2);
    expect(fieldOf(first, 'loop', BoolValue).bool).toBe(true);

    // A resting track is still present, just silent.
    const second = valueOf(parts.values[1], StructureValue);
    expect(fieldOf(second, 'sounding', BoolValue).bool).toBe(false);
    expect(fieldOf(second, 'degrees', ListValue).values.length).toBe(0);
});

test('a named Beat ignores every other music', () => {
    const { stream } = beatStream("Beat('tick')");
    // Every value is a Downbeat now, so "nothing arrived" can't be a type check.
    // The silent placeholder names no music and carries no parts; a real beat
    // names its music, so the name is what says whether anything got through.
    const nameOf = (value: Value | undefined) =>
        fieldOf(valueOf(value, StructureValue), 'name', TextValue).text;

    expect(nameOf(stream.latest())).toBe('');
    stream.react({ ...event, name: 'chime' });
    expect(nameOf(stream.latest())).toBe('');
    stream.react({ ...event, name: 'tick' });
    expect(nameOf(stream.latest())).toBe('tick');
});

test('a Beat carries a silent Downbeat before any music plays', () => {
    // The reason a creator never needs a ø guard: the stream has a readable
    // Downbeat from the start. tempo is the tell, since a playing Music is
    // clamped to at least 1 beat per minute.
    const { stream } = beatStream('Beat()');
    const initial = valueOf(stream.latest(), StructureValue);
    expect(fieldOf(initial, 'count', NumberValue).num.toNumber()).toBe(0);
    expect(fieldOf(initial, 'tempo', NumberValue).num.toNumber()).toBe(0);
    expect(fieldOf(initial, 'parts', ListValue).values.length).toBe(0);
});
