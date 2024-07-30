import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

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
    [
        `↓ sup1.a
        a
        `,
        [`↑ a: 0`],
        '0',
    ],
])('Expect %s to be %s', (code, supplements, value) => {
    expect(evaluateCode(code, supplements)?.toString()).toBe(value);
});
