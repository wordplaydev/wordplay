import { test } from 'vitest';
import UnknownLanguage from '@conflicts/UnknownLanguage';
import MissingLanguage from '@conflicts/MissingLanguage';
import { testConflict } from '@conflicts/TestUtilities';
import Language from './Language';

test.each([
    ['a/en: 5', 'a/aaa: 5', Language, UnknownLanguage],
    ['a/en: 5', 'a/: 5', Language, MissingLanguage],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
