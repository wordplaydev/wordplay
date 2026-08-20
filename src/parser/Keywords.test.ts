import { test, expect } from 'vitest';
import Sym from '@nodes/Sym';
import Token from '@nodes/Token';
import {
    buildKeywordIndex,
    getOperatorKeyword,
    getRenderableKeyword,
    Keywords,
    KeywordIds,
    type KeywordId,
    type KeywordIndex,
} from '@parser/Keywords';
import { toTokens } from '@parser/toTokens';
import { tokenize } from '@parser/Tokenizer';
import parseProgram from '@parser/parseProgram';
import canonicalizeKeywords from '@parser/canonicalizeKeywords';
import Bind from '@nodes/Bind';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Source from '@nodes/Source';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluator from '@runtime/Evaluator';
import ListValue from '@values/ListValue';
import StructureValue from '@values/StructureValue';

test('every KeywordId has a spec and the list and record agree', () => {
    expect(KeywordIds.length).toBe(Object.keys(Keywords).length);
    for (const id of KeywordIds) expect(Keywords[id]).toBeDefined();
});

test('each non-operator construct keyword resolves from its canonical glyph', () => {
    for (const id of KeywordIds) {
        const spec = Keywords[id];
        const token = new Token(spec.symbol, spec.types);
        const resolved = getRenderableKeyword(token);
        if (spec.operator)
            // Operators are intentionally not resolved by the render helper (shared Sym types).
            expect(resolved).toBeUndefined();
        else expect(resolved).toBe<KeywordId>(id);
    }
});

test('booleans disambiguate true vs false by glyph', () => {
    expect(getRenderableKeyword(new Token('⊤', Sym.Boolean))).toBe('true');
    expect(getRenderableKeyword(new Token('⊥', Sym.Boolean))).toBe('false');
});

test('a plain name is not a keyword', () => {
    expect(getRenderableKeyword(new Token('hello', Sym.Name))).toBeUndefined();
});

test('operator glyphs map to their connective keyword', () => {
    expect(getOperatorKeyword('&')).toBe('and');
    expect(getOperatorKeyword('|')).toBe('or');
    expect(getOperatorKeyword('~')).toBe('not');
    expect(getOperatorKeyword('+')).toBeUndefined();
});

test('with a keyword index, typed code words lex as dual-type (name + keyword)', () => {
    const index = buildKeywordIndex([
        { function: 'función', and: 'y', conditional: 'si' },
    ]);
    // Dual-typed: the keyword Sym is present (so it parses as the construct where expected)...
    const fn = toTokens('función', index).read();
    expect(fn.isSymbol(Sym.Function)).toBe(true);
    // ...and Sym.Name is present too (so it still works as a name — shadowing, not reserving).
    expect(fn.isSymbol(Sym.Name)).toBe(true);
    const y = toTokens('y', index).read();
    expect(y.isSymbol(Sym.Operator)).toBe(true);
    expect(y.isSymbol(Sym.Name)).toBe(true);
    // Whole-token match only: a longer name that merely starts with a keyword stays a plain name.
    const functional = toTokens('functional', index).read();
    expect(functional.isSymbol(Sym.Name)).toBe(true);
    expect(functional.isSymbol(Sym.Function)).toBe(false);
});

test('dual-type tokens: names shadow, typed construct keywords still parse as constructs', () => {
    const index = buildKeywordIndex([
        { function: 'función', number: 'número' },
    ]);
    // `número` (number-type keyword) is NOT an expression-start construct, so as a binding name it
    // shadows the keyword and parses as a Bind — existing names that collide keep working.
    const bind = parseProgram(toTokens('número: 1', index));
    expect(bind.nodes((n): n is Bind => n instanceof Bind).length).toBe(1);
    // `número` as a value parses as a reference (still a name), not the number type.
    const ref = parseProgram(toTokens('x: número', index));
    expect(ref.nodes((n): n is Bind => n instanceof Bind).length).toBe(1);
    // `función(x) x` now parses as a FunctionDefinition: the construct branch wins for a typed
    // construct keyword at expression start (the parser-position fix).
    const fn = parseProgram(toTokens('función(x) x', index));
    expect(
        fn.nodes(
            (n): n is FunctionDefinition => n instanceof FunctionDefinition,
        ).length,
    ).toBe(1);
});

test('shadow detection flags winning keywords only, not safe collisions', () => {
    // `nada` shadows the `none` keyword (an expression-start construct) → flagged.
    const idxNone = buildKeywordIndex([{ none: 'nada' }]);
    const nadaBind = parseProgram(toTokens('nada: 1', idxNone)).nodes(
        (n): n is Bind => n instanceof Bind,
    )[0];
    expect(nadaBind.names.names[0].getShadowedKeyword()).toBeDefined();
    // `número` collides with the number type, which never wins over a name → not flagged.
    const idxNum = buildKeywordIndex([{ number: 'número' }]);
    const numBind = parseProgram(toTokens('número: 1', idxNum)).nodes(
        (n): n is Bind => n instanceof Bind,
    )[0];
    expect(numBind.names.names[0].getShadowedKeyword()).toBeUndefined();
});

test('canonicalize-on-copy: constructs become symbols, shadow-names stay', () => {
    const index = buildKeywordIndex([
        { function: 'función', number: 'número', and: 'y' },
    ]);
    const canon = (code: string) => {
        const src = new Source('test', code, index);
        return canonicalizeKeywords(src.expression, src.spaces, index).trim();
    };
    // A typed construct keyword → its canonical symbol (locale-neutral clipboard).
    expect(canon('función(x) x')).toBe('ƒ(x) x');
    // An operator word → its canonical symbol.
    expect(canon('a y b')).toBe('a & b');
    // A shadow-name keeps its word (rewriting to `#` would change a name into a type).
    expect(canon('número: 1')).toBe('número: 1');
    // Symbol-only content is unchanged.
    expect(canon('ƒ(x) x')).toBe('ƒ(x) x');
});

test('canonicalize-on-copy leaves keyword words inside text and docs alone', () => {
    // A keyword is a token, not a substring: inside a text literal or a doc the word is a Sym.Words
    // token that merely spells one. Matching on text alone rewrote their contents on copy, so `"true"`
    // came back as `"⊤"` — and rendered as `⊤` in symbols mode.
    const index = buildKeywordIndex([{ true: 'true', number: 'número' }]);
    const canon = (code: string) => {
        const src = new Source('test', code, index);
        return canonicalizeKeywords(src.expression, src.spaces, index).trim();
    };
    expect(canon('"true"')).toBe('"true"');
    expect(canon('x: "true"')).toBe('x: "true"');
    expect(canon('¶true¶')).toBe('¶true¶');
    expect(canon('"a true b"')).toBe('"a true b"');
    // The same word typed as code still canonicalizes.
    expect(canon('true')).toBe('⊤');
});

test('without an index, keyword words stay names (default behavior)', () => {
    expect(toTokens('función').read().isSymbol(Sym.Name)).toBe(true);
    expect(toTokens('function').read().isSymbol(Sym.Name)).toBe(true);
});

/** Evaluate keyword-enabled code and return its final value's Wordplay text. */
function evaluateWithKeywords(code: string, index: KeywordIndex) {
    const source = new Source('test', code, index);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return new Evaluator(project, DB, [DefaultLocale]).getInitialValue();
}

test('keyword words evaluate with their construct meaning, not just parse shape', () => {
    // A typed keyword word for a boolean must carry its truth: `true` used to
    // evaluate as ⊥ because BooleanLiteral compared the token's text to `⊤` (#1296).
    const index = buildKeywordIndex([
        { true: 'true', false: 'false', and: 'and', or: 'or' },
    ]);
    expect(evaluateWithKeywords('true', index)?.toString()).toBe('⊤');
    expect(evaluateWithKeywords('false', index)?.toString()).toBe('⊥');
    expect(evaluateWithKeywords('true and true', index)?.toString()).toBe('⊤');
    expect(evaluateWithKeywords('true and false', index)?.toString()).toBe('⊥');
    // Localized words carry the same meaning: nothing is en-specific.
    const spanish = buildKeywordIndex([{ true: 'verdadero' }]);
    expect(evaluateWithKeywords('verdadero', spanish)?.toString()).toBe('⊤');
});

test('word-form logical operators short-circuit like their symbols', () => {
    const index = buildKeywordIndex([{ and: 'and', or: 'or' }]);
    // The right side is an unbound name, so it throws if evaluated; the word
    // form must skip it exactly as `&`/`|` do.
    expect(evaluateWithKeywords('(1 = 2) and nope', index)?.toString()).toBe(
        '⊥',
    );
    expect(evaluateWithKeywords('(1 = 1) or nope', index)?.toString()).toBe(
        '⊤',
    );
});

test('a keyword-word boolean flows into structure inputs (#1296)', () => {
    // The reported case: a translate building Phrases with `selectable: true`.
    const index = buildKeywordIndex([{ true: 'true' }]);
    const value = evaluateWithKeywords(
        '"AB" → [] ↦ Phrase(⬚ selectable: true name: ⬚)',
        index,
    );
    expect(value).toBeInstanceOf(ListValue);
    if (!(value instanceof ListValue)) return;
    expect(value.values.length).toBe(2);
    for (const phrase of value.values) {
        expect(phrase).toBeInstanceOf(StructureValue);
        if (!(phrase instanceof StructureValue)) return;
        const selectable = phrase.type.inputs.find((input) =>
            input.hasName('selectable'),
        );
        expect(selectable).toBeDefined();
        if (selectable === undefined) return;
        expect(phrase.resolve(selectable.names)?.toString()).toBe('⊤');
    }
});

test('pattern keyword words lex only inside a pattern, by context', () => {
    const index = buildKeywordIndex([{ letter: 'letra' }]);
    // Inside ⣿ … ⣿ the pattern partition applies.
    const inside = tokenize('⣿letra⣿', index).getTokens();
    expect(inside.some((t) => t.isSymbol(Sym.PatternLetter))).toBe(true);
    // The same word in code context is just a name (it's a pattern-only keyword).
    expect(toTokens('letra', index).read().isSymbol(Sym.Name)).toBe(true);
});
