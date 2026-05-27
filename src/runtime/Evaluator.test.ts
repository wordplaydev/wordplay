import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import EvaluationLimitException from '@values/EvaluationLimitException';
import ExceptionValue from '@values/ExceptionValue';
import NumberValue from '@values/NumberValue';
import StepLimitException from '@values/StepLimitException';

test.each([0, 1, 10, 15])('Step back %i', (steps: number) => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n - 1) + fib(n - 2)
    fib(5)
    `;

    const source = new Source('test', fib);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluator.start();
    const stepIndex = evaluator.getStepIndex();

    // Step back
    evaluator.stepBack(-steps);

    // Expect to be back precisely that many steps
    expect(evaluator.getStepIndex() === stepIndex - steps);

    // Back to the future
    evaluator.stepTo(stepIndex);
    expect(evaluator.getStepIndex() === stepIndex);
});

test('Too many steps', () => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n - 1) + fib(n - 2)
    fib(50)
    `;

    const source = new Source('test', fib);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const value = evaluator.getInitialValue();
    expect(value).toBeInstanceOf(StepLimitException);
});

test('Too many evaluations', () => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n) + fib(n - 2)
    fib(50)
    `;

    const source = new Source('test', fib);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    const value = evaluator.getInitialValue();
    expect(value).toBeInstanceOf(EvaluationLimitException);
});

// Regression test for #680: stepping through a HOF anonymous function body
// after rewinding used to skip the body and yield an exception, because Start
// (using a stepIndex-filtered lookup) did not jumpPast cached constant
// expressions like the property reference '[…].translate', while Finish DID
// reuse the cached value at the matching stepIndex — leaking pushed inputs onto
// the value stack and feeding the wrong value (the list, not the user function)
// into the iteration.
test('Stepping through a HOF after rewinding runs the function body (#680)', () => {
    const source = new Source('test', '[1 2 3 4].translate(ƒ(a) a + 1)');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);

    // Play to completion, then pause (user clicks "pause").
    evaluator.start();
    evaluator.pause();

    // Locate the `a + 1` BinaryEvaluate node in the AST.
    const addExpr = source.expression
        .nodes()
        .find((n): n is BinaryEvaluate => n instanceof BinaryEvaluate);
    if (addExpr === undefined) throw new Error('expected to find a + 1');

    // Rewind to the beginning (user clicks "step to start").
    evaluator.stepTo(0);

    // Step forward one step at a time. The Iteration's Next handler must run
    // and push a function-body Evaluation — assert we actually enter and finish
    // `a + 1` four times, never seeing an exception in its slot.
    const observedValues: string[] = [];
    let safety = 0;
    while (!evaluator.isDone() && safety++ < 500) {
        evaluator.step();

        const value = evaluator.getLatestExpressionValue(addExpr);
        // Never an exception for a non-internal expression in this program.
        expect(value).not.toBeInstanceOf(ExceptionValue);

        if (value instanceof NumberValue) {
            const num = value.num.toString();
            if (
                observedValues.length === 0 ||
                observedValues[observedValues.length - 1] !== num
            )
                observedValues.push(num);
        }
    }

    expect(observedValues).toEqual(['2', '3', '4', '5']);
});
