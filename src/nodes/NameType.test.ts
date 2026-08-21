import { UnknownName } from '@conflicts/UnknownName';
import { testConflict } from '@conflicts/TestUtilities';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import { UnknownTypeName } from '@conflicts/UnknownTypeName';
import { test } from 'vitest';
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
