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

function beatStream(code: string) {
    const project = Project.make(null, 't', new Source('t', code), [], DefaultLocale);
    // Reactive and playing: StreamValue.add() drops values while stepping.
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.start();
    const streams = evaluator.getBasisStreamsOfType(Beat);
    return { evaluator, stream: streams[0] };
}

const event = {
    name: 'song',
    count: 7,
    tempo: 96,
    volume: 0.5,
    key: 2,
    scale: [0, 2, 4, 5, 7, 9, 11],
    instruments: ['piano', 'drums'],
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

test('a Downbeat carries the music state and one Part per track', () => {
    const { stream } = beatStream('Beat()');
    expect(stream).toBeDefined();
    stream.react(event);
    const value = stream.latest();
    expect(value).toBeInstanceOf(StructureValue);
    const down = value as StructureValue;

    const num = (n: string) => (down.resolve(n) as NumberValue).toNumber();
    expect((down.resolve('name') as TextValue).text).toBe('song');
    expect(num('count')).toBe(7);
    expect(num('tempo')).toBe(96);
    // A gain is unitless 0-1, matching how `50%` evaluates.
    expect(num('volume')).toBe(0.5);
    expect(num('key')).toBe(2);
    expect((down.resolve('scale') as ListValue).values.length).toBe(7);
    expect((down.resolve('instruments') as ListValue).values.length).toBe(2);

    const parts = down.resolve('parts') as ListValue;
    expect(parts.values.length).toBe(2);
    const first = parts.values[0] as StructureValue;
    expect(first).toBeInstanceOf(StructureValue);
    expect(
        ((first.resolve('instrument') as StructureValue).resolve('id') as TextValue).text,
    ).toBe('piano');
    expect((first.resolve('sounding') as BoolValue).bool).toBe(true);
    expect((first.resolve('degrees') as ListValue).values.length).toBe(2);
    expect((first.resolve('pitch') as ListValue).values.length).toBe(2);
    expect((first.resolve('volume') as NumberValue).toNumber()).toBe(0.75);
    expect((first.resolve('pan') as NumberValue).toNumber()).toBe(-0.5);
    expect((first.resolve('key') as NumberValue).toNumber()).toBe(2);
    expect((first.resolve('loop') as BoolValue).bool).toBe(true);

    // A resting track is still present, just silent.
    const second = parts.values[1] as StructureValue;
    expect((second.resolve('sounding') as BoolValue).bool).toBe(false);
    expect((second.resolve('degrees') as ListValue).values.length).toBe(0);
});

test('a named Beat ignores every other music', () => {
    const { stream } = beatStream("Beat('tick')");
    // Every value is a Downbeat now, so "nothing arrived" can't be a type check.
    // The silent placeholder names no music and carries no parts; a real beat
    // names its music, so the name is what says whether anything got through.
    const nameOf = (value: Value | undefined) =>
        ((value as StructureValue).resolve('name') as TextValue).text;

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
    const initial = stream.latest() as StructureValue;
    expect(initial).toBeInstanceOf(StructureValue);
    expect((initial.resolve('count') as NumberValue).num.toNumber()).toBe(0);
    expect((initial.resolve('tempo') as NumberValue).num.toNumber()).toBe(0);
    expect((initial.resolve('parts') as ListValue).values.length).toBe(0);
});
