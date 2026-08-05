import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import { Sym } from '@nodes/Sym';
import { expect, test } from 'vitest';

test('a reference to an operator satisfies its own grammar', () => {
    // parseReference reads a Sym.Operator token for the `fun` of a unary or binary
    // evaluate, so every `1 + 1` holds one. When the field's kind rejected it,
    // Reference.clone's replaceChild silently returned the old name instead.
    const source = new Source('test', '1 + 1');
    const reference = source.nodes().find((node) => node instanceof Reference);
    expect(reference).toBeDefined();
    if (reference === undefined) return;
    expect(reference.name.isSymbol(Sym.Operator)).toBe(true);
    const field = reference.getGrammar().find((f) => f.name === 'name');
    expect(field?.kind.allows(reference.name)).toBe(true);
});

test('a reference to a name still satisfies its own grammar', () => {
    const source = new Source('test', 'x');
    const reference = source.nodes().find((node) => node instanceof Reference);
    expect(reference).toBeDefined();
    if (reference === undefined) return;
    const field = reference.getGrammar().find((f) => f.name === 'name');
    expect(field?.kind.allows(reference.name)).toBe(true);
});
