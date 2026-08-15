import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';
import { isTailCall } from '@nodes/tailCall';
import { expect, test } from 'vitest';

/** Find the Evaluate node whose source text matches the given text, ignoring spaces. */
function getCall(source: Source, text: string): Evaluate {
    const expected = text.replace(/\s+/g, '');
    const call = source.expression
        .nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.toWordplay().replace(/\s+/g, '') === expected,
        );
    if (call === undefined)
        throw new Error(`Expected to find the call ${text}`);
    return call;
}

test.each([
    // A function's body is a tail position.
    ['ƒ f(n•#) •# f(n)\nf(1)', 'f(n)', true],
    // A top-level call is not: the root block is not a function body.
    ['ƒ f(n•#) •# f(n)\nf(1)', 'f(1)', false],
    // Both branches of a conditional in a function body are tail positions...
    ['ƒ f(n•#) •# n > 10 ? f(n + 1) n\nf(1)', 'f(n + 1)', true],
    ['ƒ f(n•#) •# n > 10 ? n f(n + 1)\nf(1)', 'f(n + 1)', true],
    // ...but the condition is not.
    ['ƒ f(n•?) •? f(⊤) ? ⊤ ⊥\nf(⊥)', 'f(⊤)', false],
    // A block's last statement is a tail position when it is the sole result.
    ['ƒ f(n•#) •# (a: n + 1 f(a))\nf(1)', 'f(a)', true],
    // With multiple results, the block's value is a list, so no statement is.
    ['ƒ f(n•#) (n f(n))\nf(1)', 'f(n)', false],
    // An operand's value is consumed by the operation, not returned.
    ['ƒ f(n•#) •# 1 + f(n)\nf(1)', 'f(n)', false],
    // An anonymous function's body is a tail position of that function.
    ['ƒ g(a•#) •# a\n[1 2].translate(ƒ(a•#) g(a))', 'g(a)', true],
    // Composition: a conditional branch inside a sole-result block.
    ['ƒ f(n•#) •# (a: n + 1 a > 10 ? a f(a))\nf(1)', 'f(a)', true],
    // A structure's body is not a function body.
    ['ƒ f(n•#) •# n\n•S(n•#) (f(n))\nS(1)', 'f(n)', false],
])('isTailCall(%s, %s) = %s', (code, callText, expected) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    expect(isTailCall(getCall(source, callText), context)).toBe(expected);
});
