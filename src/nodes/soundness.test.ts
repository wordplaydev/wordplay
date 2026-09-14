import DefaultLocale from '@locale/DefaultLocale';
import Match from '@nodes/Match';
import NameToken from '@nodes/NameToken';
import Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import { Sym } from '@nodes/Sym';
import TextLiteral from '@nodes/TextLiteral';
import Token from '@nodes/Token';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { expect, test } from 'vitest';

/**
 * The tree's few unsound spots, each of which was a real defect rather than a
 * hypothetical one. They are gathered here because they share a cause: a
 * declared type the old code could not actually honor.
 */

test('a clone that built the wrong class throws rather than lying about its type', () => {
    // `clone(): this` is the one place the tree asserts, so `cloned()` checks it
    // at runtime. Without the check, a clone() body that returned some other
    // node type would type-check and go wrong much later, somewhere else.
    class Impostor extends NumberLiteral {
        clone(): this {
            return this.cloned(new Token('nope', Sym.Name));
        }
    }
    const impostor = new Impostor(new Token('1', Sym.Number));
    expect(() => impostor.clone()).toThrow(/built a/);
});

test('an ordinary clone of every node kind keeps its class', () => {
    for (const code of ['1', "'hi'", '[1 2 3]', '{1:2}', 'ƒ f() 1', 'a: 1'])
        for (const node of parseExpression(toTokens(code)).traverseTopDown())
            expect(Object.getPrototypeOf(node.clone())).toBe(
                Object.getPrototypeOf(node),
            );
});

test('a deep-cloned name token is still a name token', () => {
    // NameToken used to be a subclass, but Token.clone() builds a plain Token,
    // so `instanceof NameToken` was false for every clone — which is what made
    // the placeholder in NodeConcept.getRepresentation unfindable after an edit.
    const name = NameToken('greeting');
    const clone = name.clone();
    expect(clone).toBeInstanceOf(Token);
    expect(clone.isSymbol(Sym.Name)).toBe(true);
    expect(clone.getText()).toBe('greeting');
});

test('a text literal always has a translation to choose', () => {
    // `getLocaleText` returned `texts[0]`, so a literal built with no
    // translations handed `undefined` to everything downstream.
    const empty = new TextLiteral([]);
    expect(empty.texts.length).toBeGreaterThan(0);
    expect(empty.getLocaleText([DefaultLocale]).getText()).toBe('');
    expect(empty.getValue([DefaultLocale]).text.toString()).toBe('');
});

test('a match always has a condition node, however truncated the source', () => {
    // `parseMatch` reads its condition inside a closure, so TypeScript could
    // not see that the loop body always runs; the old code asserted through
    // `unknown` and would have built a Match with an undefined condition.
    for (const code of ['1 ??? 1: 2 3', '1 ???', '1 ??? 1:', '1 ??? ']) {
        const parsed = parseExpression(toTokens(code));
        const matches = parsed
            .traverseTopDown()
            .filter((node): node is Match => node instanceof Match);
        expect(matches.length).toBeGreaterThan(0);
        for (const match of matches) expect(match.other).toBeInstanceOf(Node);
    }
});
