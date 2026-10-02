import IncompatibleType from '#conflicts/IncompatibleType.ts';
import PropertyBind from '#nodes/PropertyBind.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import { expect, test } from 'vitest';
import DefaultLocales from '#locale/DefaultLocales.ts';
import evaluateCode from '#runtime/evaluate.ts';

test.each([
    ['•Test(n•#)\nb: Test(1).n: 2\nb.n', '2'],
    ['•Test(n•#)\nb: (Test(1).n: 2).n: 3\nb.n', '3'],
    ['•Test(a•#) (b: a + 1)\n(Test(1).a: 2).b', '3'],
    ['•Test(a•#) (ƒ b() a + 1)\n(Test(1).a: 2).b()', '3'],
])('Expect "%s" to be "%s"', (source, value) => {
    expect(evaluateCode(source)?.toWordplay(DefaultLocales)).toBe(value);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([
    [
        '•T(b•#) ()\na: T(1)\na.b: 2',
        "•T(b•#) ()\na: T(1)\na.b: 'x'",
        PropertyBind,
        IncompatibleType,
        0,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});
