import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from './Evaluator';
import { getDefaultBasis } from '../basis/Basis';

const basis = getDefaultBasis();

test.each([
    ['! = !', TRUE_SYMBOL],
    ['! = !nan', FALSE_SYMBOL],
    ['! = 1', FALSE_SYMBOL],
])('Expect %s to be %s', (code, value) => {
    expect(Evaluator.evaluateCode(basis, code)?.toString()).toBe(value);
});

test('Test equality', () => {});
