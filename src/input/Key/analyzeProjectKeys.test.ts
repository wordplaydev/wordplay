import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import { Locales } from '@db/Database';
import { readProjects } from '../../examples/readProjects';
import analyzeProjectKeys, { type KeyAnalysis } from './analyzeProjectKeys';

function analyze(code: string): KeyAnalysis {
    const project = Project.make(
        'p',
        'name',
        new Source('main', code),
        [],
        DefaultLocale,
    );
    return analyzeProjectKeys(project);
}

/** The canonical keys found, sorted, or the kind when not specific. */
function keys(code: string): string[] | string {
    const analysis = analyze(code);
    return analysis.kind === 'specific'
        ? Array.from(analysis.keys).sort()
        : analysis.kind;
}

test('A literal filter names its key', () => {
    expect(keys(`Key('ArrowRight' ⊤)`)).toEqual(['ArrowRight']);
});

test('A localized key name canonicalizes', () => {
    // Programs see localized names ('Space'), but the stage dispatches ' '.
    expect(keys(`Key('Space')`)).toEqual([' ']);
});

test('Comparisons against a bound stream collect their literals', () => {
    expect(
        keys(`
key: Key()
message: '' … ∆ key … (key = 'ArrowLeft') ? 'left' ((key = 'ArrowRight') ? 'right' message)`),
    ).toEqual(['ArrowLeft', 'ArrowRight']);
});

test('Inequality comparisons count too', () => {
    expect(
        keys(`
key: Key()
n: 0 … ∆ key … (key ≠ 'Enter') ? n (n + 1)`),
    ).toEqual(['Enter']);
});

test('A key passed to a function is followed into its parameter', () => {
    // The Heart Attack shape: the comparison happens in a helper, against
    // the parameter rather than the stream.
    expect(
        keys(`
ƒ respond(k•'') (k = 'ArrowLeft') ? 'left' ((k = 'Space') ? 'jump' 'none')
key: Key()
out: '' … ∆ key … respond(key)`),
    ).toEqual([' ', 'ArrowLeft']);
});

test('A key compared to a structure field collects every construction', () => {
    // The Chimes shape: keys live in a table of data, not in the comparison.
    expect(
        keys(`
•Chime(degree•# key•'')
chimes•[Chime]: [Chime(1 'a') Chime(2 's') Chime(3 'd')]
key: Key()
hit: ø … ∆ key … chimes.find(ƒ(c•Chime) c.key = key)`),
    ).toEqual(['a', 'd', 's']);
});

test('A computed structure field is unbounded', () => {
    expect(
        keys(`
•Chime(key•'')
letter: 'a'
chimes•[Chime]: [Chime('a') Chime(letter)]
key: Key()
hit: ø … ∆ key … chimes.find(ƒ(c•Chime) c.key = key)`),
    ).toBe('unbounded');
});

test('A stream only observed for change is any-key', () => {
    expect(keys(`flap: ∆ Key()`)).toBe('any');
});

test('A bound stream whose value is never read is any-key', () => {
    expect(keys(`key: Key()\nn: 0 … ∆ key … n + 1`)).toBe('any');
});

test('Specific keys win over an any-key use of the same stream', () => {
    expect(
        keys(`
key: Key()
n: 0 … ∆ key … (key = 'a') ? n + 1 n`),
    ).toEqual(['a']);
});

test('A list of literals asked whether it has the key bounds it', () => {
    expect(keys(`vowel: ['a' 'e' 'i'].has(Key())`)).toEqual(['a', 'e', 'i']);
});

test('Substring matching on the key is unbounded', () => {
    // `has` on text is substring matching, so the real key set is every key
    // whose name contains the substring.
    expect(keys(`arrow: Key().has('Arrow')`)).toBe('unbounded');
});

test('Using the key as an index is unbounded', () => {
    // The Adventure shape: any key could be a lookup.
    expect(
        keys(`
options: {'1': 'north' '2': 'south'}
key: Key()
choice: '' … ∆ key … options{key} ?? ''`),
    ).toBe('unbounded');
});

test('Displaying the key is unbounded', () => {
    expect(keys(`key: Key()\nPhrase(key)`)).toBe('unbounded');
});

test('Placement contributes the keys the stage maps for it', () => {
    const analysis = analyze(`Phrase('a' place: Placement())`);
    expect(analysis.kind).toBe('specific');
    if (analysis.kind !== 'specific') return;
    expect(analysis.keys.has('ArrowLeft')).toBe(true);
    expect(analysis.keys.has('ArrowUp')).toBe(true);
    expect(analysis.keys.has('=')).toBe(true);
});

test('Too many keys falls back to the keyboard', () => {
    const comparisons = 'abcdefghijklm'
        .split('')
        .map((letter) => `(key = '${letter}')`)
        .join(' | ');
    expect(
        keys(`
key: Key()
n: 0 … ∆ key … (${comparisons}) ? n + 1 n`),
    ).toBe('unbounded');
});

/**
 * The examples that motivated the key pad. These pin the analysis against
 * real programs rather than the reductions above, since each one combines
 * shapes in ways a hand-written case wouldn't.
 */
test.each([
    // Keys held in a table of data, reached through a helper's parameter.
    ['Chimes', ['a', 'd', 'f', 'g', 's']],
    // Comparisons in a helper, including 'Space' for the space bar.
    ['HeartAttack', [' ', 'ArrowLeft', 'ArrowRight', 'Enter']],
    // Only asks whether a key happened.
    ['HummingBird', 'any'],
    // Comparisons right beside the stream.
    ['SlideShow', ['ArrowLeft', 'ArrowRight']],
    ['Pounce', ['ArrowLeft', 'ArrowRight']],
    // A filter passed to the stream itself.
    ['ShowAndTell', ['ArrowRight']],
    // Uses the key to index a map, so any key could matter.
    ['Adventure', 'unbounded'],
])('%s analyzes as expected', async (name, expected) => {
    const serialized = readProjects('examples').find(
        (example) => example.id === name,
    );
    expect(serialized, `example ${name} exists`).toBeDefined();
    if (serialized === undefined) return;
    const project = await Project.deserialize(Locales, serialized);
    const analysis = analyzeProjectKeys(project);
    expect(
        analysis.kind === 'specific'
            ? Array.from(analysis.keys).sort()
            : analysis.kind,
    ).toEqual(expected);
});
