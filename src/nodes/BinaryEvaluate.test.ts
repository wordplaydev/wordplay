import IncompatibleInput from '@conflicts/IncompatibleInput';
import { testConflict } from '@conflicts/TestUtilities';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import { FALSE_SYMBOL, NOT_SYMBOL, OR_SYMBOL } from '@parser/Symbols';
import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Source from '@nodes/Source';

test.each([
    ['1 × 5', '1 × ""', BinaryEvaluate, IncompatibleInput],
    [
        '(1ms % 5) = 1ms',
        '(1ms % 5) + "hi"',
        BinaryEvaluate,
        IncompatibleInput,
        1,
    ],
    ['1 + 1', '1 + !', BinaryEvaluate, IncompatibleInput],
    ['1m + 1m', '1m + 1s', BinaryEvaluate, IncompatibleInput],
    [
        `${FALSE_SYMBOL} ${OR_SYMBOL} ${FALSE_SYMBOL}`,
        `${FALSE_SYMBOL} ${OR_SYMBOL} 1`,
        BinaryEvaluate,
        IncompatibleInput,
    ],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    },
);

test.each([
    ['1 + 2', '3'],
    ['1 - 2', '-1'],
    ['1 - -2', '3'],
    ['⊥ | ⊥', '⊥'],
    ['⊥ | ⊤', '⊤'],
    ['⊤ | ⊤', '⊤'],
    ['⊥ & ⊥', '⊥'],
    ['⊥ & ⊤', '⊥'],
    ['⊤ & ⊤', '⊤'],
    ['⊥ & ⊤ ? 1 2', '2'],
    ['⊤ & ~⊤', '⊥'],
    ['~(⊤ & ⊤)', '⊥'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test('A zero-input operator function still labels the right placeholder', () => {
    // `~` takes no inputs, so a binary `~` has no input to name its right operand
    // after. Labeling it used to dereference the missing input and throw, which
    // crashed the whole editor view. This is the label path TokenView renders.
    const source = new Source('test', `${FALSE_SYMBOL} ${NOT_SYMBOL} _`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const root = source.root;
    const placeholder = source
        .nodes()
        .find((node) => node instanceof ExpressionPlaceholder);
    expect(placeholder).toBeDefined();
    if (placeholder === undefined) return;
    const accessor = root
        .getParent(placeholder)
        ?.getChildPlaceholderLabel(
            placeholder,
            project.getLocales(),
            project.getNodeContext(root.root),
            root,
        );
    expect(accessor).toBeDefined();
    if (accessor === undefined) return;
    expect(project.getLocales().getUnannotatedPrimaryText(accessor)).toBe(
        DefaultLocale.node.BinaryEvaluate.right,
    );
});
