import Evaluator from '@runtime/Evaluator';
import { test, expect } from 'vitest';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();

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
    expect(Evaluator.evaluateCode(native, code, supplements)?.toString()).toBe(
        value
    );
});
