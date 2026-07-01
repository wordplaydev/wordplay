import { describe, expect, test } from 'vitest';
import Source from '@nodes/Source';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import NumberLiteral from '@nodes/NumberLiteral';
import type Node from '@nodes/Node';
import {
    getDragHighlights,
    getSearchMatches,
    Highlights,
} from '@components/editor/highlights/Highlights';

/** The matched substrings (sliced from the source code) for `query` over `code`. */
function matchedSubstrings(code: string, query: string): string[] {
    const source = new Source('test', code);
    const text = source.code;
    return getSearchMatches(source, query, 'en').map((m) =>
        text.substring(m.start, m.end).toString(),
    );
}

describe('getSearchMatches', () => {
    test('matches substrings within token text, not whole tokens', () => {
        // "cat" appears inside both `cat` and `cats`; each match is just "cat".
        const matches = matchedSubstrings('cat: 1\ncats: 2', 'cat');
        expect(matches).toEqual(['cat', 'cat']);
    });

    test('matches a partial substring of a token', () => {
        // Query "at" matches the middle/end of `cat`, returning just "at".
        expect(matchedSubstrings('cat: 1', 'at')).toEqual(['at']);
    });

    test('matching is case-insensitive but preserves original case', () => {
        expect(matchedSubstrings('Cat: 1', 'cat')).toEqual(['Cat']);
    });

    test('records non-overlapping matches within a token', () => {
        // "aa" in "aaaa" matches at offsets 0 and 2, not 1/3 (non-overlapping).
        expect(matchedSubstrings('aaaa: 1', 'aa')).toEqual(['aa', 'aa']);
    });

    test('a blank or whitespace-only query matches nothing', () => {
        expect(matchedSubstrings('cat: 1', '')).toEqual([]);
        expect(matchedSubstrings('cat: 1', '   ')).toEqual([]);
    });

    test('a query that matches no token text returns nothing', () => {
        expect(matchedSubstrings('cat: 1', 'zzz')).toEqual([]);
    });
});

describe('getDragHighlights', () => {
    test('a live dragged node is highlighted', () => {
        const source = new Source('test', '1 + 2');
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const dragged = source.find<Node>(NumberLiteral);
        const result = getDragHighlights(
            source,
            project,
            dragged,
            undefined,
            undefined,
            true,
            false,
        );
        expect(result.get(dragged)).toContain('dragged');
    });

    test('a stale hovered target not in the project is ignored, not walked (#1213)', () => {
        // Regression for #1213: a mid-drag project revision leaves the hovered/insertion store
        // pointing at a node from a since-replaced tree. The guard must not walk that stale target
        // (which can throw a `.length`-of-undefined deep in analysis); it just isn't highlighted.
        const source = new Source('test', '1 + 2');
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const dragged = source.find<Node>(NumberLiteral);
        const detached = new Source('stale', '9');
        const staleHovered = detached.find<Node>(NumberLiteral);
        let result: Highlights | undefined;
        expect(() => {
            result = getDragHighlights(
                source,
                project,
                dragged,
                staleHovered,
                undefined,
                true,
                false,
            );
        }).not.toThrow();
        // The stale hovered node must not be highlighted as a drop target.
        expect(result?.get(staleHovered)).toBeUndefined();
    });
});
