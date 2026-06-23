import Caret from '@edit/caret/Caret';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** The numeric (non-node) caret positions enumerated for blocks-mode movement. */
function blockPositions(code: string): number[] {
    const source = new Source('test', code);
    const caret = new Caret(source, 0, undefined, undefined);
    return caret
        .getBlockPositions()
        .filter((p): p is number => typeof p === 'number');
}

test('blocks-mode caret positions include empty-line beginnings, not trailing/indentation whitespace', () => {
    // A list with a tab-indented 1, a blank line, a tab-indented 2:
    //   index: [=0 \n=1 \t=2 1=3 \n=4 \n=5 \t=6 2=7 \n=8 ]=9
    const positions = blockPositions('[\n\t1\n\n\t2\n]');
    // The blank line's beginning (position 5) is navigable in blocks mode.
    expect(positions).toContain(5);
    // The tab indentation before each value (positions 2 and 6) is NOT — that
    // whitespace has no visual anchor in blocks mode, so the caret can't land there.
    expect(positions).not.toContain(2);
    expect(positions).not.toContain(6);
});

test('blocks-mode caret positions exclude trailing space at end of a line', () => {
    // Two values with trailing spaces before the newline:
    //   index: [=0 1=1 (space)=2 (space)=3 \n=4 2=5 \n=6 ]=7
    const positions = blockPositions('[1  \n2\n]');
    // Position 2 is the END of token "1" (a valid editable-token position), but
    // the interior of the trailing whitespace — between the two spaces (3) and at
    // the newline (4) — is not navigable, since it has no visual anchor.
    expect(positions).not.toContain(3);
    expect(positions).not.toContain(4);
});

test('getBlockPositions is cached on the source and stays sorted across carets', () => {
    // The result is a pure function of the source, cached on the Source so
    // repeated (per-keypress) calls are cheap. Map each position to a source
    // index so we can assert exact ordering across sources.
    const code = '[\n\t1\n\n\t2\n]';
    const indices = (src: Source) => {
        const positions = new Caret(
            src,
            0,
            undefined,
            undefined,
        ).getBlockPositions();
        return positions.map((p) =>
            typeof p === 'number' ? p : (src.getNodeFirstPosition(p) ?? -1),
        );
    };

    const source = new Source('test', code);
    const first = new Caret(source, 0, undefined, undefined).getBlockPositions();
    // A different caret on the SAME source returns the cached array verbatim.
    const second = new Caret(
        source,
        3,
        undefined,
        undefined,
    ).getBlockPositions();
    expect(second).toBe(first); // same array reference (cache hit)

    // Sorted non-decreasing by source position, and a fresh source with the same
    // code produces the identical ordering.
    const sourceIndices = indices(source);
    expect(sourceIndices).toEqual([...sourceIndices].sort((a, b) => a - b));
    expect(indices(new Source('test', code))).toEqual(sourceIndices);
});

test('left moves in blocks mode do not corrupt the cached positions', () => {
    // moveInlineBlock reverses the position list to search backward; since
    // getBlockPositions now returns a cached array, an in-place reverse would
    // permanently flip the cache and send later left-moves to the program start.
    const source = new Source('test', '[\n\t1\n\n\t2\n]');
    const expected = [
        ...new Caret(source, 0, undefined, undefined).getBlockPositions(),
    ];
    new Caret(source, 7, undefined, undefined).moveInlineBlock(-1);
    new Caret(source, 7, undefined, undefined).moveInlineBlock(-1);
    expect(source.getCachedBlockPositions()).toEqual(expected);
});

test('text-mode inline movement still steps through whitespace one character at a time', () => {
    // getBlockPositions is blocks-only; text-mode movement is unaffected and may
    // still navigate into indentation whitespace.
    const source = new Source('test', '[\n\t1\n\n\t2\n]');
    const caret = new Caret(source, 5, undefined, undefined);
    // From the blank-line position, a right-move advances one char into the next
    // line's tab indentation (position 6) rather than skipping it.
    expect(caret.moveInlineText(false, 1).position).toBe(6);
});
