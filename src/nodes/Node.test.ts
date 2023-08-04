import { test, expect } from 'vitest';
import { parseExpression, toTokens } from '@parser/Parser';
import Bind from './Bind';
import Docs from './Docs';
import Language from './Language';
import NumberLiteral from './NumberLiteral';
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
    ['1 + 2', NumberLiteral, 1, '3', '1 + 3'],
    ['1 + 2 + 3', NumberLiteral, 2, '4', '1 + 2 + 4'],
    // Replace Node with undefined
    ['"Hi"/en', Language, 0, undefined, '"Hi"'],
    ['``Hi``/en(1)', Docs, 0, undefined, '(1)'],
    // Remove Node in list
    ['[ 1 2 3 ]', NumberLiteral, 0, undefined, '[ 2 3 ]'],
    // Replace Node in list
    ['[ 1 2 3 ]', NumberLiteral, 0, '4', '[ 4 2 3 ]'],
    // Set field to node
    ['1 + 2', 'left', 0, '3', '3 + 2'],
    // Replace Node with invalid Node
    ['a.b', Reference, 1, '1', 'a.b'],
    // Replace Node with invalid Node in list
    ['ƒ a(b c)', Bind, 0, '1', 'ƒ a(b c)'],
    // Replace Node with invalid undefined
    ['ƒ a(b c)', Token, 0, '1', 'ƒ a(b c)'],
    // Replace field with invalid Node
    ['ƒ a(b c)', 'inputs', 0, '[ 1 2 3 ]', 'ƒ a(b c)'],
])(
    'Replace in %s: %i %i with %s, producing %s',
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
