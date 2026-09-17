import { expect, test } from 'vitest';
import Source from '@nodes/Source';
import Caret from '@edit/caret/Caret';
import diffSources from '@edit/diff/sourceDiff';
import describeDiffAtCaret from '@edit/diff/describeDiff';
import DefaultLocales from '@locale/DefaultLocales';

/** A caret on `source` at the first position of the token whose text is `at`. */
function caretAt(source: Source, at: string): Caret {
    const token = source.leaves().find((leaf) => leaf.getText() === at);
    if (token === undefined) throw new Error(`no token ${at}`);
    return new Caret(
        source,
        source.getTokenTextPosition(token) ?? 0,
        undefined,
        undefined,
        undefined,
    );
}

function describe(before: string, after: string, at: string) {
    const beforeSource = new Source('test', before);
    return describeDiffAtCaret(
        caretAt(beforeSource, at),
        diffSources(beforeSource, new Source('test', after)),
        DefaultLocales,
    );
}

test('says nothing when no older version is being viewed', () => {
    // The common case, and the one that has to be cheap.
    const source = new Source('test', 'a: 1');
    expect(
        describeDiffAtCaret(caretAt(source, 'a'), undefined, DefaultLocales),
    ).toBeUndefined();
});

test('says nothing about code both versions share', () => {
    expect(describe('alpha: 1\nbeta: 2', 'alpha: 1', 'alpha')).toBeUndefined();
});

test('names code that restoring would bring back', () => {
    expect(describe('alpha: 1\nbeta: 2', 'alpha: 1', 'beta')).toBe(
        'comes back if you restore',
    );
});

test('names code that restoring would take away, and what it is', () => {
    const description = describe('alpha: 1', 'alpha: 1\nbeta: 2', '');
    expect(description).toContain('goes away');
    expect(description).toContain('beta');
});

test('a replacement names both halves, not just the one coming back', () => {
    // The caret is on this version's `2`; what it needs to hear is that `3`
    // stands there now, which is why the current version's code hangs off the
    // token it would replace.
    const description = describe('alpha: 1\nbeta: 2', 'alpha: 1\nbeta: 3', '2');
    expect(description).toContain('comes back');
    expect(description).toContain('3');
});
