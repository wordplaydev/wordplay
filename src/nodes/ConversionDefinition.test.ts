import { testConflict } from '../conflicts/TestUtilities';
import { test } from 'vitest';
import ConversionDefinition from './ConversionDefinition';
import { MisplacedConversion } from '../conflicts/MisplacedConversion';

test.each([
    ['( → # #m 5)', '1 + → # #m 5', ConversionDefinition, MisplacedConversion],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
