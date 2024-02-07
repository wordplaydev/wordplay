import { expect, test } from 'vitest';
import Project from '../models/Project';
import Source from '@nodes/Source';
import EvaluationLimitException from '../values/EvaluationLimitException';
import StepLimitException from '../values/StepLimitException';
import Evaluator from '@runtime/Evaluator';
import { DB } from '../db/Database';
import DefaultLocale, { DefaultLocales } from '../locale/DefaultLocale';

test.each([0, 1, 10, 15])('Step back %i', (steps: number) => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n - 1) + fib(n - 2)
    fib(5)
    `;

    const source = new Source('test', fib);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, DefaultLocales);
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
    const evaluator = new Evaluator(project, DB, DefaultLocales);
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
    const evaluator = new Evaluator(project, DB, DefaultLocales);
    const value = evaluator.getInitialValue();
    expect(value).toBeInstanceOf(EvaluationLimitException);
});
