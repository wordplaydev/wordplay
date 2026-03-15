import { MisplacedConversion } from '@conflicts/MisplacedConversion';
import { testConflict } from '@conflicts/TestUtilities';
import { test } from 'vitest';
import ConversionDefinition from './ConversionDefinition';

test.each([
    ['( → # #m 5)', '1 + → # #m 5', ConversionDefinition, MisplacedConversion],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);
