import { expect, test } from 'vitest';
import Project from '../models/Project';
import Source from '../nodes/Source';
import EvaluationException from './EvaluationException';

test.each([0, 1, 10, 15])('Step back %i', (steps: number) => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n - 1) + fib(n - 2)
    fib(5)
    `;

    const source = new Source('test', fib);
    const project = new Project('test', source, []);
    project.evaluate();
    const stepIndex = project.evaluator.getStepIndex();

    // Step back
    project.evaluator.stepBack(-steps);

    // Expect to be back precisely that many steps
    expect(project.evaluator.getStepIndex() === stepIndex - steps);

    // Back to the future
    project.evaluator.stepTo(stepIndex);
    expect(project.evaluator.getStepIndex() === stepIndex);
});

test('Too many steps', () => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n - 1) + fib(n - 2)
    fib(50)
    `;

    const source = new Source('test', fib);
    const project = new Project('test', source, []);
    project.evaluate();
    expect(project.evaluator.getLatestSourceValue(source)).toBeInstanceOf(
        EvaluationException
    );
});

test('Too many evaluations', () => {
    const fib = `
    ƒ fib (n•#) •# n ≤ 1 ? n fib(n) + fib(n - 2)
    fib(50)
    `;

    const source = new Source('test', fib);
    const project = new Project('test', source, []);
    project.evaluate();
    expect(project.evaluator.getLatestSourceValue(source)).toBeInstanceOf(
        EvaluationException
    );
});
