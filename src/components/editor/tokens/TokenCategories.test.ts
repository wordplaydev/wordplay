import {
    getRoleTypes,
    getTokenCategory,
} from '#components/editor/tokens/TokenCategories.ts';
import { Sym } from '#nodes/Sym.ts';
import { expect, test } from 'vitest';

test('a token is coloured by its first Sym', () => {
    expect(getTokenCategory([Sym.Name])).toBe('name');
    expect(getTokenCategory(Sym.Boolean)).toBe('literal');
    expect(getTokenCategory([Sym.Operator])).toBe('operator');
});

test('a word rendered as its symbol is coloured as that symbol', () => {
    // The tokenizer gives a keyword word the construct's Sym after Sym.Name, so colouring by the
    // token's own first Sym made `⊤` — rendered from the word `true` — read as a name.
    expect(getTokenCategory([Sym.Name, Sym.Boolean])).toBe('name');
    expect(getTokenCategory([Sym.Name, Sym.Boolean], [Sym.Boolean])).toBe(
        'literal',
    );
    expect(getTokenCategory([Sym.Name, Sym.Operator], [Sym.Operator])).toBe(
        'operator',
    );
});

test('a dual-typed glyph is coloured by the role its parent gives it', () => {
    const question = [Sym.BooleanType, Sym.Conditional];
    // A conditional `?` reads like `??` and `???`; the type `?` keeps its colour.
    expect(
        getTokenCategory(question, getRoleTypes(question, 'Conditional')),
    ).toBe(getTokenCategory([Sym.Otherwise]));
    expect(getTokenCategory([Sym.Match])).toBe(
        getTokenCategory([Sym.Otherwise]),
    );
    expect(
        getTokenCategory(question, getRoleTypes(question, 'BooleanType')),
    ).toBe(getTokenCategory(question));

    const range = [Sym.Operator, Sym.Range];
    expect(getTokenCategory(range, getRoleTypes(range, 'RangeType'))).toBe(
        getTokenCategory([Sym.NumberType]),
    );
    expect(getRoleTypes(range, 'BinaryEvaluate')).toBeUndefined();
});
