import Evaluator from '@runtime/Evaluator';
import { test, expect } from 'vitest';
import { DefaultLocale } from '../db/Creator';

test.each([
    [
        `
Time()
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
])('Expect %s to be %s', (code, supplements, value) => {
    expect(
        Evaluator.evaluateCode(DefaultLocale, code, supplements)?.toString()
    ).toBe(value);
});
