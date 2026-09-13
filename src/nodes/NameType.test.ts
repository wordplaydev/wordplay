import { UnknownName } from '@conflicts/UnknownName';
import { testConflict } from '@conflicts/TestUtilities';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import { UnknownTypeName } from '@conflicts/UnknownTypeName';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import NameType from '@nodes/NameType';

test.each([
    [
        '•Cat() ()\na•Cat: Cat()',
        'ƒ Cat() 1\na•Cat: 1',
        NameType,
        UnknownTypeName,
    ],
    [
        '•Cat⸨T⸩() ()\na•Cat⸨#⸩: Cat(1)',
        '•Cat()\na•Cat⸨#⸩: Cat()',
        NameType,
        UnexpectedTypeInput,
    ],
])('Expect %s no conflicts, %s to have one', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['•T() ()\na•T: T()\na', 'a•Nope: 1\na', NameType, UnknownName, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);

/** A name reached through a kit (#1373). Round-tripping matters as much as parsing: the
 *  qualifier lives in its own field rather than inside the name token, which is what keeps
 *  the rename passes — which splice `name` — from destroying it. */
test.each([
    ['a•colors.Sprite: 1\na', 'colors', 'Sprite'],
    ['a•Sprite: 1\na', undefined, 'Sprite'],
])('%s parses its kit and name', (code, kit, name) => {
    const type = new Source('test', code)
        .nodes()
        .find((n): n is NameType => n instanceof NameType);
    expect(type).toBeDefined();
    expect(type?.kit?.getText()).toBe(kit);
    expect(type?.getName()).toBe(name);
    // The qualifier survives serialization, so a saved project keeps meaning what it meant.
    expect(new Source('test', code).toWordplay()).toBe(code);
});
