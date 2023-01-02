import { testConflict } from '../conflicts/TestUtilities';
import DuplicateLanguages from '../conflicts/DuplicateLanguages';
import { test } from 'vitest';
import Docs from './Docs';

test.each([
    [
        '`hi`/eng`hola`/spa Cat → "" "meow"',
        '`hi`/eng`hola`/eng Cat → "" "meow"',
        Docs,
        DuplicateLanguages,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
