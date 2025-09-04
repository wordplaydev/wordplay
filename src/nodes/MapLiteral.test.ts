import { NotAKeyValue } from '@conflicts/NotAKeyValue';
import { testConflict } from '@conflicts/TestUtilities';
import { test } from 'vitest';
import MapLiteral from './MapLiteral';

test.each([['{1:1 2:2 3:3}', '{1:1 2 3:3}', MapLiteral, NotAKeyValue]])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);
