import { test, expect } from 'vitest';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Creator';

test.each([
    ['{1 2 3}.add(1)', '{1 2 3}'],
    ['{1 2 3}.add(4)', '{1 2 3 4}'],
    ['{1 2 3}.remove(1)', '{2 3}'],
    ['{1 2 3}.union({3 4})', '{1 2 3 4}'],
    ['{1 2 3}.intersection({2 3 4})', '{2 3}'],
    ['{1 2 3}.difference({3 4 5})', '{1 2}'],
    ['{1 2 3}.filter(ƒ(v) v % 2 = 1)', '{1 3}'],
    ['{1 2 3}.translate(ƒ(v) v + 2)', '{3 4 5}'],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});
