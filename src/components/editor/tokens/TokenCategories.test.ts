import { getTokenCategory } from '@components/editor/tokens/TokenCategories';
import { Sym } from '@nodes/Sym';
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
