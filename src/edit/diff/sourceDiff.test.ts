import { expect, test } from 'vitest';
import Source from '@nodes/Source';
import Token from '@nodes/Token';
import { Sym } from '@nodes/Sym';
import type Node from '@nodes/Node';
import diffSources, { type SourceDiff } from '@edit/diff/sourceDiff';
import fingerprint from '@edit/diff/fingerprint';

function diff(before: string, after: string): SourceDiff {
    return diffSources(new Source('test', before), new Source('test', after));
}

/** Tokens only this version has — what restoring would bring back. */
function onlyHere(before: string, after: string): string[] {
    const source = new Source('test', before);
    const result = diffSources(source, new Source('test', after));
    return source
        .leaves()
        .filter((token) => result.tokens.get(token)?.onlyHere === true)
        .map((token) => token.getText());
}

/**
 * Each run of current-version code, as `anchor:code` in document order, with
 * `<` or `>` saying whether it is drawn before or after its anchor.
 */
function onlyNow(before: string, after: string): string[] {
    const source = new Source('test', before);
    const result = diffSources(source, new Source('test', after));
    const runs = source.leaves().flatMap((token) => {
        const entry = result.tokens.get(token);
        if (entry === undefined) return [];
        const name = token.isSymbol(Sym.End) ? '<end>' : token.getText();
        return [
            ...(entry.onlyNowBefore === undefined
                ? []
                : [`<${name}:${textOf(entry.onlyNowBefore)}`]),
            ...(entry.onlyNowAfter === undefined
                ? []
                : [`>${name}:${textOf(entry.onlyNowAfter)}`]),
        ];
    });
    return result.trailing.length > 0
        ? [...runs, `<end>:${textOf(result.trailing)}`]
        : runs;
}

function textOf(nodes: Node[]): string {
    return nodes
        .flatMap((node) => node.leaves())
        .map((token) => token.getText())
        .join(' ');
}

test('a source is not different from itself', () => {
    const result = diff('a: 1\nb: 2\na + b', 'a: 1\nb: 2\na + b');
    expect(result.tokens.size).toBe(0);
    expect(result.trailing).toHaveLength(0);
    expect(result.onlyHereTokens).toBe(0);
    expect(result.onlyNowTokens).toBe(0);
});

test('reformatting is not a change, because space lives outside the tree', () => {
    const result = diff('a: 1\nb: 2', 'a:   1\n\n\nb:  2');
    expect(result.onlyHereTokens).toBe(0);
    expect(result.onlyNowTokens).toBe(0);
});

test('a token whose text changed is marked, and what stands there now beside it', () => {
    expect(onlyHere('a: 1', 'a: 2')).toEqual(['1']);
    // Drawn after this version's token, so the two readings of one place sit
    // together on one line.
    expect(onlyNow('a: 1', 'a: 2')).toEqual(['>1:2']);
});

test('a renamed name inside a big expression marks only that name', () => {
    const before = "Phrase('hello' size: 2m rest: 1s place: Place(1m 2m))";
    const after = "Phrase('howdy' size: 2m rest: 1s place: Place(1m 2m))";
    // Finer than a whole literal: a TextLiteral's delimiters are their own
    // tokens, so only the words between them are marked.
    expect(onlyHere(before, after)).toEqual(['hello']);
    expect(onlyNow(before, after)).toEqual(['>hello:howdy']);
});

test('a statement appended anchors on the end of the source', () => {
    expect(onlyHere('a: 1', 'a: 1\nb: 2')).toEqual([]);
    expect(onlyNow('a: 1', 'a: 1\nb: 2')).toEqual(['<<end>:b : 2']);
});

test('a statement only this version has is marked, with nothing beside it', () => {
    expect(onlyHere('a: 1\nb: 2', 'a: 1')).toEqual(['b', ':', '2']);
    expect(onlyNow('a: 1\nb: 2', 'a: 1')).toEqual([]);
});

test('a statement inserted in the middle anchors on the one that follows it', () => {
    // The anchor must be `c`, not `a` — anchoring on the preceding statement
    // would draw every insertion one statement early.
    expect(onlyNow('a: 1\nc: 3', 'a: 1\nb: 2\nc: 3')).toEqual(['<c:b : 2']);
});

test('two insertions at one anchor keep their document order', () => {
    expect(onlyNow('a: 1\nd: 4', 'a: 1\nb: 2\nc: 3\nd: 4')).toEqual([
        '<d:b : 2 c : 3',
    ]);
});

test('an empty source gains everything at its end token', () => {
    const result = diff('', 'a: 1');
    expect(result.onlyHereTokens).toBe(0);
    expect(result.onlyNowTokens).toBeGreaterThan(0);
});

test('a source emptied loses everything and gains nothing', () => {
    const result = diff('a: 1', '');
    expect(result.onlyNowTokens).toBe(0);
    expect(result.onlyHereTokens).toBeGreaterThan(0);
});

test('two unrelated programs neither crash nor under-report', () => {
    const before = new Source('test', "Phrase('a')");
    const after = new Source('test', '1 + 2 + 3');
    const result = diffSources(before, after);
    // Every token of each side is accounted for, End excluded: End is the same
    // token on both sides and is what the ghosts anchor to.
    expect(result.onlyHereTokens).toBeGreaterThan(0);
    expect(result.onlyNowTokens).toBeGreaterThan(0);
});

test('every anchor is a token of the before tree', () => {
    // The invariant that keeps a foreign node id out of the DOM: an after-tree
    // token leaking into this map would be rendered with a `data-id` that
    // collides with the live source mounted in another tile.
    const before = new Source('test', 'a: 1\nb: 2\nc: 3');
    const after = new Source('test', 'a: 1\nx: 9\nc: 3\nd: 4');
    const result = diffSources(before, after);
    const leaves = new Set<Token>(before.leaves());
    for (const anchor of result.tokens.keys())
        expect(leaves.has(anchor)).toBe(true);
});

test('counts match the marks actually produced', () => {
    const before = new Source('test', 'a: 1\nb: 2\nc: 3');
    const after = new Source('test', 'a: 1\nc: 3\nd: 4');
    const result = diffSources(before, after);
    let here = 0;
    let fromNow = 0;
    for (const entry of result.tokens.values()) {
        if (entry.onlyHere) here++;
        for (const node of [
            ...(entry.onlyNowBefore ?? []),
            ...(entry.onlyNowAfter ?? []),
        ])
            fromNow += node.leaves().length;
    }
    for (const node of result.trailing) fromNow += node.leaves().length;
    expect(here).toBe(result.onlyHereTokens);
    expect(fromNow).toBe(result.onlyNowTokens);
});

test('one changed element of a long list marks only that element', () => {
    // The affix strip earning its place: a full alignment table over these two
    // would be a million cells.
    const items = Array.from({ length: 1000 }, (_, index) => `${index}`);
    const before = `[${items.join(' ')}]`;
    const changed = [...items];
    changed[500] = '9999';
    const after = `[${changed.join(' ')}]`;
    const result = diff(before, after);
    expect(result.onlyHereTokens).toBe(1);
    expect(result.onlyNowTokens).toBe(1);
});

test('a fingerprint survives an independent parse', () => {
    // The trap this module exists for: `Node.hash()` bottoms out in a global id
    // counter, so it reports two identical parses as entirely different.
    const one = new Source('test', 'a: 1\nb: 2');
    const two = new Source('test', 'a: 1\nb: 2');
    expect(fingerprint(one.expression)).toBe(fingerprint(two.expression));
    expect(one.expression.hash()).not.toBe(two.expression.hash());
});

test('two tokens of the same text but different symbols are different', () => {
    // `types` earning its place: a `?` lexed as a BooleanType and a `?` lexed
    // as a Conditional are the same characters and different code.
    expect(fingerprint(new Token('?', Sym.BooleanType))).not.toBe(
        fingerprint(new Token('?', Sym.Conditional)),
    );
});

test('a token stands for its canonical symbol, not the word typed for it', () => {
    // `getCanonicalText` earning its place: a localized keyword carries the
    // symbol it means, and two sources meaning the same thing in two languages
    // are not a change. (A Source built without a KeywordIndex never marks a
    // token canonical, so this is asserted on the tokens directly.)
    expect(fingerprint(new Token('true', Sym.Boolean, '⊤'))).toBe(
        fingerprint(new Token('⊤', Sym.Boolean)),
    );
});
