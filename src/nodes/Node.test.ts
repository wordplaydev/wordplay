import { test, expect } from 'vitest';
import { parseExpression, toTokens } from '@parser/Parser';
import Bind from './Bind';
import Docs from './Docs';
import Language from './Language';
import MeasurementLiteral from './MeasurementLiteral';
import Reference from './Reference';
import Token from './Token';

test.each([
    '1',
    'fun()',
    '1 + 1',
    '(1 + 1)',
    '[1 2 3 4 5]',
    '{ 1 2 3 4 }',
    'fun(1 2 3)',
])('Clone %s', (code) => {
    const original = parseExpression(toTokens(code)).clone();
    expect(original.clone().isEqualTo(original));
});

test.each([
    // Replace Node with node
    ['1 + 2', MeasurementLiteral, 1, '3', '1 + 3'],
    ['1 + 2 + 3', MeasurementLiteral, 2, '4', '1 + 2 + 4'],
    // Replace Node with undefined
    ['"Hi"/en', Language, 0, undefined, '"Hi"'],
    ['`Hi`/en(1)', Docs, 0, undefined, '(1)'],
    // Remove Node in list
    ['[ 1 2 3 ]', MeasurementLiteral, 0, undefined, '[ 2 3 ]'],
    // Replace Node in list
    ['[ 1 2 3 ]', MeasurementLiteral, 0, '4', '[ 4 2 3 ]'],
    // Set field to node
    ['1 + 2', 'left', 0, '3', '3 + 2'],
    // Set field to undefined
    ['"Hi"/en', 'format', 0, undefined, '"Hi"'],
    // Replace Node with invalid Node
    ['a.b', Reference, 1, '1', 'a.b'],
    // Replace Node with invalid Node in list
    ['ƒ a(b c)', Bind, 0, '1', 'ƒ a(b c)'],
    // Replace Node with invalid undefined
    ['ƒ a(b c)', Token, 0, '1', 'ƒ a(b c)'],
    // Replace field with invalid Node
    ['ƒ a(b c)', 'inputs', 0, '[ 1 2 3 ]', 'ƒ a(b c)'],
])(
    'Replace in %s',
    (code, type: Function | string, number, replacement, result) => {
        const expr = parseExpression(toTokens(code));
        const newNode =
            replacement === undefined
                ? undefined
                : parseExpression(toTokens(replacement));
        const expected = parseExpression(toTokens(result));
        // Find the node to replace
        const oldNode =
            typeof type === 'string'
                ? type
                : expr.nodes((s) => s instanceof type)[number];
        const newExpr = expr.replace(oldNode, newNode);
        expect(newExpr.isEqualTo(expected)).toBeTruthy();
    }
);
