import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import { DefaultLocale } from '../db/Creator';

test.each([
    ['! = !', TRUE_SYMBOL],
    ['! = !nan', FALSE_SYMBOL],
    ['! = 1', FALSE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(DefaultLocale, code)?.toString()).toBe(value);
});

test('Test equality', () => {});