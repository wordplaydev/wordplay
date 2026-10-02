import { MisplacedConversion } from '#conflicts/MisplacedConversion.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import { test } from 'vitest';
import ConversionDefinition from '#nodes/ConversionDefinition.ts';

test.each([
    ['( → # #m 5)', '1 + → # #m 5', ConversionDefinition, MisplacedConversion],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);
