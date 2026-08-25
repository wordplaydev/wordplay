import { describe, expect, test } from 'vitest';
import Source from '@nodes/Source';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import NumberLiteral from '@nodes/NumberLiteral';
import type Node from '@nodes/Node';
import Evaluate from '@nodes/Evaluate';
import {
    getDragHighlights,
    getProjectHighlights,
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

describe('getProjectHighlights', () => {
    function highlightsFor(code: string, blocks: boolean) {
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const stage = source.find<Evaluate>(Evaluate);
        expect(stage).toBeDefined();
        return {
            stage,
            highlights: getProjectHighlights(
                source,
                project,
                undefined,
                undefined,
                undefined,
                undefined,
                [stage],
                blocks,
            ),
        };
    }

    /** Project highlights for `code`, with runtime node sets chosen from its
     *  own tree so identities match the source being highlighted. */
    function runtimeHighlights(
        code: string,
        pick: (source: Source) => { animating?: Node[]; sounding?: Node[] },
    ) {
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const picked = pick(source);
        return {
            source,
            highlights: getProjectHighlights(
                source,
                project,
                undefined,
                undefined,
                picked.animating ? new Set(picked.animating) : undefined,
                picked.sounding ? new Set(picked.sounding) : undefined,
                undefined,
                false,
            ),
        };
    }

    test('animating and sounding nodes get their own highlight kinds', () => {
        // Both are runtime highlights drawn under the code, and one node can
        // carry both — a number determining a note inside a phrase that is
        // also animating. Asserted on the node itself, so marking some other
        // node instead wouldn't pass.
        let number: NumberLiteral | undefined;
        const { highlights } = runtimeHighlights("Phrase(1→'')", (source) => {
            number = source.find<NumberLiteral>(NumberLiteral);
            expect(number).toBeDefined();
            return { animating: [number!], sounding: [number!] };
        });
        expect(highlights.get(number!)).toEqual(['animating', 'sounding']);
    });

    test('runtime nodes from another source are ignored', () => {
        // The animating and sounding sets are per-evaluator while highlights
        // are per-source, so a node this source doesn't hold must not be
        // marked — that filter is what discards basis-built nodes.
        const other = new Source('other', "Phrase(2→'')");
        const stray = other.find<NumberLiteral>(NumberLiteral);
        expect(stray).toBeDefined();
        const { highlights } = runtimeHighlights("Phrase(1→'')", () => ({
            animating: [stray!],
            sounding: [stray!],
        }));
        expect([...highlights.entries()]).toEqual([]);
    });

    test('marks the whole selected Evaluate, not just its name', () => {
        // Selection means "the caret is somewhere inside this output", so the mark
        // covers the whole node. Asserted both ways: checking only that the node is
        // marked would pass just as happily if the name were marked instead.
        const { stage, highlights } = highlightsFor(
            "Stage([Phrase('hi')])",
            false,
        );
        expect(highlights.get(stage)).toContain('output');
        expect(highlights.get(stage.fun)).toBeUndefined();
    });

    test('marks the same node in blocks mode', () => {
        // Only the traced shape differs by mode (rows vs. rounded block); which node
        // is marked does not.
        const { stage, highlights } = highlightsFor(
            "Stage([Phrase('hi')])",
            true,
        );
        expect(highlights.get(stage)).toContain('output');
    });
});
