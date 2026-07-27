import { expect, test } from 'vitest';
import {
    choosePool,
    filterPoolByCase,
    type ScriptData,
} from '@output/animation/textEffectPool';

test('filterPoolByCase matches the sample case', () => {
    const pool = ['a', 'b', 'A', 'B', 'CH', '5', '日'];
    // Lowercase sample: uppercase entries (including digraphs) drop.
    expect(filterPoolByCase('cat', pool)).toEqual(['a', 'b', '5', '日']);
    // Uppercase sample: lowercase entries drop.
    expect(filterPoolByCase('CAT', pool)).toEqual(['A', 'B', 'CH', '5', '日']);
    // Titlecase letters count as uppercase.
    expect(filterPoolByCase('ǅ', pool)).toEqual(['A', 'B', 'CH', '5', '日']);
    // Mixed case: untouched.
    expect(filterPoolByCase('Cat', pool)).toEqual(pool);
    // Caseless: untouched.
    expect(filterPoolByCase('日本 123', pool)).toEqual(pool);
    // Never empty a non-empty pool.
    expect(filterPoolByCase('cat', ['A', 'B'])).toEqual(['A', 'B']);
});

/** A tiny script world: Latin a/b/A/B, Cyrillic а/б/А, Han 日/本. */
function scriptData(): ScriptData {
    const entries: [string, string][] = [
        ['a', 'Latn'],
        ['b', 'Latn'],
        ['A', 'Latn'],
        ['B', 'Latn'],
        ['а', 'Cyrl'],
        ['б', 'Cyrl'],
        ['А', 'Cyrl'],
        ['日', 'Hani'],
        ['本', 'Hani'],
    ];
    const scripts = new Map<number, string>();
    const pools = new Map<string, string[]>();
    for (const [character, script] of entries) {
        const codepoint = character.codePointAt(0);
        if (codepoint === undefined) continue;
        scripts.set(codepoint, script);
        const pool = pools.get(script);
        if (pool) pool.push(character);
        else pools.set(script, [character]);
    }
    return { pools, scripts };
}

test('choosePool prefers the language pool when it writes the text script', () => {
    expect(
        choosePool('ab', 'ba', ['a', 'b', 'A', 'B'], scriptData()),
    ).toEqual(['a', 'b']);
});

test('choosePool rejects a language pool in the wrong script', () => {
    // Latin-Serbian text must not cycle Cyrillic (Serbian's CLDR exemplars
    // are Cyrillic-only, though the language also writes Latin): the pool is
    // rejected and the Latin script pool takes over.
    expect(choosePool('ab', 'ba', ['а', 'б', 'А'], scriptData())).toEqual([
        'a',
        'b',
    ]);
});

test('choosePool falls back to the script pool without a language pool', () => {
    expect(choosePool('日', '本', undefined, scriptData())).toEqual([
        '日',
        '本',
    ]);
});

test('choosePool is undefined for scriptless text with no language', () => {
    expect(choosePool('😀', '🎉', undefined, scriptData())).toBeUndefined();
});

test('choosePool case-filters whichever pool wins', () => {
    expect(
        choosePool('AB', 'BA', ['a', 'b', 'A', 'B'], scriptData()),
    ).toEqual(['A', 'B']);
    expect(choosePool('AB', 'BA', undefined, scriptData())).toEqual([
        'A',
        'B',
    ]);
});
