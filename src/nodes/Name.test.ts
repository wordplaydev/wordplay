import { testConflict } from '@conflicts/TestUtilities';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnknownName } from '@conflicts/UnknownName';
import { expect, test } from 'vitest';
import Name from '@nodes/Name';
import Names from '@nodes/Names';
import Reference from '@nodes/Reference';

test('Test name conflicts', () => {
    testConflict('a: 1\na', 'b: 1\na', Reference, UnknownName);
    testConflict(
        'ƒ(a•# b•#) a + b',
        'ƒ(a•# b•#) a + c',
        Reference,
        UnknownName,
        2,
    );
    testConflict(
        '•Math(a b) (z: a + b)',
        '•Math(a b) (z: a + c)',
        Reference,
        UnknownName,
        2,
    );
    testConflict(
        'table: ⎡a•#⎦\ntable ⎡- a = 0',
        'table: ⎡a•#⎦\ntable ⎡- b = 0',
        Reference,
        UnknownName,
        1,
    );
    testConflict(
        'ƒ⸨T⸩(a) a + 2',
        'ƒ⸨T⸩() T + 1',
        Reference,
        UnexpectedTypeVariable,
    );
});

test('Basis-type delimiters count as symbolic names', () => {
    for (const delimiter of ["''", '#', 'ø', '⊤⊥', '[]', '{}', '{:}', '⎡⎦', '`…`'])
        expect(Name.make(delimiter).isSymbolic()).toBe(true);
    // A word name or a lone letter is not symbolic.
    expect(Name.make('Text').isSymbolic()).toBe(false);
    expect(Name.make('x').isSymbolic()).toBe(false);
});

test('A basis type splits into word name and delimiter subscript', () => {
    // Mirrors how a concept link resolves @Text: word name as the label, delimiter as the subscript.
    const names = Names.make(["''", 'Text']);
    expect(names.getSymbolicName()).toBe("''");
    expect(names.getPreferredNameString([], false)).toBe('Text');
});
