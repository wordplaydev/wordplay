import { test } from 'vitest';
import InvalidLanguage from '../conflicts/InvalidLanguage';
import MissingLanguage from '../conflicts/MissingLanguage';
import { testConflict } from '../conflicts/TestUtilities';
import Language from './Language';

test.each([
    ['a/en: 5', 'a/aaa: 5', Language, InvalidLanguage],
    ['a/en: 5', 'a/: 5', Language, MissingLanguage],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
