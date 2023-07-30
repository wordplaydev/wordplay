import { expect, test } from 'vitest';
import Project from '../models/Project';
import Source from '@nodes/Source';
import EvaluationLimitException from './EvaluationLimitException';
import StepLimitException from './StepLimitException';
import Evaluator from './Evaluator';
import { getDefaultBasis } from '../basis/Basis';

const basis = getDefaultBasis();

test.each([0, 1, 10, 15])('Step back %i', (steps: number) => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n - 1) + fib(n - 2)
    fib(5)
    `;

    const source = new Source('test', fib);
    const project = new Project(null, 'test', source, [], basis);
    const evaluator = new Evaluator(project);
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
    const project = new Project(null, 'test', source, [], basis);
    const evaluator = new Evaluator(project);
    evaluator.start();
    expect(evaluator.getLatestSourceValue(source)).toBeInstanceOf(
        StepLimitException
    );
});

test('Too many evaluations', () => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n) + fib(n - 2)
    fib(50)
    `;

    const source = new Source('test', fib);
    const project = new Project(null, 'test', source, [], basis);
    const evaluator = new Evaluator(project);
    evaluator.start();
    expect(evaluator.getLatestSourceValue(source)).toBeInstanceOf(
        EvaluationLimitException
    );
});
