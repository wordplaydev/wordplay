import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from './Evaluator';
import { getDefaultNative } from '../native/Native';

const native = await getDefaultNative();

test.each([
    ['! = !', TRUE_SYMBOL],
    ['! = !nan', FALSE_SYMBOL],
    ['! = 1', FALSE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(native, code)?.toString()).toBe(value);
});

test('Test equality', () => {});
