import Evaluator from '@runtime/Evaluator';
import { test, expect } from 'vitest';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();

test.each([
    ['•Test(n•#)\nb: Test(1).n: 2\nb.n', '2'],
    ['•Test(n•#)\nb: (Test(1).n: 2).n: 3\nb.n', '3'],
])('Expect "%s" to be "%s"', (source, value) => {
    expect(Evaluator.evaluateCode(native, source)?.toWordplay(['en'])).toBe(
        value
    );
});
