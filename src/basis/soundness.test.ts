import { Basis } from '@basis/Basis';
import type { BasisTypeName } from '@basis/BasisConstants';
import DefaultLocales from '@locale/DefaultLocales';
import { expect, test } from 'vitest';

const basis = Basis.getLocalizedBasis(DefaultLocales);

/**
 * The basis used to hand back a `StructureDefinition` for any string at all:
 * `structureDefinitionsByName` was a `Record<string, …>` whose reads were
 * declared total, so a kind it had never registered came back as `undefined`
 * with the compiler saying otherwise. It is a `Map` now, and the one caller
 * that must have an answer names the invariant.
 */

/** Every kind the basis actually registers a definition for. */
const Registered: BasisTypeName[] = [
    'boolean',
    'list',
    'map',
    'measurement',
    'none',
    'set',
    'text',
];

test('every registered basis kind resolves to its own definition', () => {
    for (const kind of Registered) {
        const definition = basis.getSimpleDefinition(kind);
        expect(definition).toBeDefined();
        expect(basis.structureDefinitionsByName.get(kind)).toBe(definition);
    }
});

test('a kind the basis never registered is absent rather than undefined-as-a-definition', () => {
    // `structuredefinition` is a type name with no structure of its own. The
    // lookup must say so; the old Record said it had one and produced undefined.
    expect(basis.structureDefinitionsByName.get('structuredefinition')).toBe(
        undefined,
    );
    expect(() => basis.getSimpleDefinition('structuredefinition')).toThrow();
});

test('the basis is shared per locale rather than rebuilt', () => {
    // Bases is keyed by locale name, which is why a synthetic locale must never
    // claim a shipped one's name; this pins the identity the cache depends on.
    expect(Basis.getLocalizedBasis(DefaultLocales)).toBe(basis);
});
