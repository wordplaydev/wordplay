import { describe, expect, test } from 'vitest';
import {
    getJobCount,
    makeOrderedEmitter,
    parseShard,
    shardLocales,
} from '#util/verify-locales/parallelLocales.ts';

describe('parseShard', () => {
    test('is undefined when unset', () => {
        expect(parseShard(undefined)).toBeUndefined();
        expect(parseShard('')).toBeUndefined();
    });
    test('reads an index below the count', () => {
        expect(parseShard('0/4')).toEqual({ index: 0, count: 4 });
        expect(parseShard('3/4')).toEqual({ index: 3, count: 4 });
    });
    test.each(['4/4', '-1/2', 'x', '1/0', '1'])('refuses %s', (value) => {
        expect(typeof parseShard(value)).toBe('string');
    });
});

test('shards cover every locale exactly once', () => {
    const locales = Array.from({ length: 31 }, (_, index) => `l${index}`);
    for (const count of [1, 2, 4, 8, 40]) {
        const all = Array.from({ length: count }, (_, index) =>
            shardLocales(locales, { index, count }),
        ).flat();
        expect(all.toSorted()).toEqual(locales.toSorted());
    }
});

test('job count honors JOBS and otherwise caps at eight cores', () => {
    expect(getJobCount('1', 16)).toBe(1);
    expect(getJobCount('12', 2)).toBe(12);
    expect(getJobCount(undefined, 4)).toBe(4);
    expect(getJobCount(undefined, 16)).toBe(8);
    expect(getJobCount('nope', 2)).toBe(2);
});

describe('ordered emitter', () => {
    test('emits blocks in order whatever order they finish in', () => {
        const out: string[] = [];
        const emitter = makeOrderedEmitter(['a', 'b', 'c'], (line) =>
            out.push(line),
        );
        emitter.line('c', 'c1');
        emitter.line('b', 'b1');
        emitter.line('c', 'c2');
        emitter.finish('c');
        emitter.finish('b');
        expect(out).toEqual([]);
        emitter.line('a', 'a1');
        emitter.finish('a');
        expect(out).toEqual(['a1', 'b1', 'c1', 'c2']);
        expect(emitter.drain()).toEqual([]);
    });

    test('drains what a crashed child left, naming the locales it never finished', () => {
        const out: string[] = [];
        const emitter = makeOrderedEmitter(['a', 'b', 'c'], (line) =>
            out.push(line),
        );
        emitter.line('a', 'a1');
        emitter.line('c', 'c1');
        emitter.finish('c');
        expect(emitter.drain()).toEqual(['a', 'b']);
        expect(out).toEqual(['a1', 'c1']);
    });
});
