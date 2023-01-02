import Evaluator from '../runtime/Evaluator';
import { test, expect } from 'vitest';

test.each([
    [
        `
↓ time
time
`,
        [],
        '0ms',
    ],
    [
        `
        ↓ sup1
        sup1
    `,
        [`0`],
        '0',
    ],
    [
        `↓ time
         time`,
        ,
        '0ms',
    ],
])('Expect %s to be %s', (code, supplements, value) => {
    expect(Evaluator.evaluateCode(code, supplements)?.toString()).toBe(value);
});
