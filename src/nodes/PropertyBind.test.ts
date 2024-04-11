import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';
import { DefaultLocales } from '../locale/DefaultLocale';

test.each([
    ['•Test(n•#)\nb: Test(1).n: 2\nb.n', '2'],
    ['•Test(n•#)\nb: (Test(1).n: 2).n: 3\nb.n', '3'],
    ['•Test(a•#) (b: a + 1)\n(Test(1).a: 2).b', '3'],
    ['•Test(a•#) (ƒ b() a + 1)\n(Test(1).a: 2).b()', '3'],
])('Expect "%s" to be "%s"', (source, value) => {
    expect(evaluateCode(source)?.toWordplay(DefaultLocales)).toBe(value);
});
