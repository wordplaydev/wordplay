import { test, expect } from 'vitest';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['{1 2 3}.add(1)', '{1 2 3}'],
    ['{1 2 3}.add(4)', '{1 2 3 4}'],
    ['{1 2 3}.remove(1)', '{2 3}'],
    ['{1 2 3}.union({3 4})', '{1 2 3 4}'],
    ['{1 2 3}.intersection({2 3 4})', '{2 3}'],
    ['{1 2 3}.difference({3 4 5})', '{1 2}'],
    ['{1 2 3}.filter(ƒ(v) v % 2 = 1)', '{1 3}'],
    ['{1 2 3}.translate(ƒ(v) v + 2)', '{3 4 5}'],
    ['{1 2 3} = ø', '⊥'],
    ['{1 2 3} ≠ ø', '⊤'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
