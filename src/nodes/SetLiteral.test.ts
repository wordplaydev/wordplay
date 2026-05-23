import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';

test('set literal with one element', () => {
    expect(evaluateCode('{1}')?.toString()).toBe('{1}');
});

test('set literal with multiple elements', () => {
    expect(evaluateCode('{1 2 3}')?.toString()).toBe('{1 2 3}');
});

test('set literal with string elements', () => {
    expect(evaluateCode("{'a' 'b' 'c'}")?.toString()).toBe('{"a" "b" "c"}');
});

test('set literal removes duplicate elements', () => {
    expect(evaluateCode('{1 1 2}')?.toString()).toBe('{1 2}');
});

test('set size via .size()', () => {
    expect(evaluateCode('{1 2 3}.size()')?.toString()).toBe('3');
});

test('set is not equal to empty set', () => {
    expect(evaluateCode('{1 2 3} = ø')?.toString()).toBe('⊥');
});

test('set is not empty', () => {
    expect(evaluateCode('{1 2 3} ≠ ø')?.toString()).toBe('⊤');
});

test('set union combines two sets', () => {
    expect(evaluateCode('{1 2}.union({3 4})')?.toString()).toBe('{1 2 3 4}');
});

test('set intersection finds common elements', () => {
    expect(evaluateCode('{1 2 3}.intersection({2 3 4})')?.toString()).toBe('{2 3}');
});

test('set difference removes elements', () => {
    expect(evaluateCode('{1 2 3}.difference({2 3})')?.toString()).toBe('{1}');
});
