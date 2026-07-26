import Time from '@input/Time/Time';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { expect, test, vi } from 'vitest';
import { DB, Locales } from '@db/Database';
import { readProjects } from '../examples/readProjects';
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

// A stream created while stepping (e.g., stepping through a program from the
// beginning) must still record its initial value: the creation is part of
// evaluation itself, and resolving a valueless stream crashed with an invalid
// WeakMap key (stepping through Hiragana.wp).
test('streams created while stepping still have an initial value', () => {
    const source = new Source('test', 'Time()');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    // Step from the very beginning, before any stream exists.
    evaluator.pause();
    evaluator.start();
    let safety = 0;
    while (!evaluator.isDone() && safety++ < 1000) evaluator.step();
    const value = evaluator.getLatestSourceValue(source);
    expect(value).not.toBeInstanceOf(ExceptionValue);
    expect(value).toBeInstanceOf(NumberValue);
    evaluator.stop();
});

// Edit and step modes discard new stream inputs entirely: nothing is recorded
// into the input history and no evaluation starts, so stray interactions can't
// extend the frozen history the creator is editing or navigating. (While paused,
// StreamValue.add already drops values; this flag is the explicit backstop at the
// evaluator's react() for any input path that still reaches it.)
test('setIgnoringInputs discards stream inputs; hasInputHistory reflects the record', () => {
    const source = new Source('test', 'Time()');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    // Play mode, so stream inputs reach the evaluator's react().
    evaluator.start();

    expect(evaluator.hasInputHistory()).toBe(false);

    const stream = Array.from(evaluator.streamsByCreator.values())[0]?.[0];
    expect(stream).not.toBeUndefined();

    // Ignoring inputs? The input is discarded, not recorded.
    evaluator.setIgnoringInputs(true);
    stream!.add(Time.make(source, 1), null);
    expect(evaluator.hasInputHistory()).toBe(false);

    // Accepting inputs again? The input is recorded.
    evaluator.setIgnoringInputs(false);
    stream!.add(Time.make(source, 2), null);
    expect(evaluator.hasInputHistory()).toBe(true);
    // Flush the pooled temporal reaction so the evaluator isn't left mid-pool.
    evaluator.flush();

    // The flag survives evaluator replacement via mirror().
    evaluator.setIgnoringInputs(true);
    const replacement = new Evaluator(
        project,
        DB,
        [DefaultLocale],
        false,
        evaluator,
    );
    expect(replacement.isIgnoringInputs()).toBe(true);

    evaluator.stop();
    replacement.stop();
});

// Rewinding to the beginning and pressing play used to freeze evaluation permanently: the
// replay of the initial evaluation takes fewer steps than the history recorded (the first
// evaluation ran before any constant was memoized), so the evaluator could never reach its
// own step count, stayed `isInPast()` forever, and therefore recorded no reactions and no
// source values — a blank, frozen stage. Reproduced with the Hiragana example, whose
// reaction makes the shortfall large enough to strand it.
function rewindThenPlay(project: Project) {
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);

    // Evaluate, then freeze, as edit and step modes do.
    evaluator.setIgnoringInputs(true);
    evaluator.start(undefined, false);
    evaluator.pause();
    const present = evaluator.getStepIndex();
    expect(present).toBeGreaterThan(0);

    // Rewind to the beginning, as entering step mode does.
    evaluator.stepTo(0);
    expect(evaluator.isInPast()).toBe(true);
    expect(evaluator.getStepIndex()).toBe(0);

    // Play. We must end up in the present, with a value to render.
    evaluator.setIgnoringInputs(false);
    evaluator.play();
    expect(evaluator.isInPast()).toBe(false);
    expect(evaluator.getStepIndex()).toBe(present);
    expect(evaluator.getLatestSourceValue(evaluator.getMain())).toBeDefined();

    evaluator.stop();
}

test('Playing after rewinding to the beginning resumes in the present', () => {
    const source = new Source('test', 'g: 15 … ∆ Time() … -g\ng');
    rewindThenPlay(Project.make(null, 'test', source, [], DefaultLocale));
});

// The reported case. Hiragana combines a reaction with memoized constants, so its replay falls
// several steps short of the recorded count — far enough that nothing but reconciling the two
// gets it back to the present.
test('Playing the Hiragana example after rewinding resumes in the present', async () => {
    const example = readProjects('examples').find((p) =>
        p.name.includes('Hiragana'),
    );
    if (example === undefined) throw new Error('Expected a Hiragana example');
    rewindThenPlay(await Project.deserialize(Locales, example));
});

// mirror() restores the prior evaluator's position, but the replacement's step count reflects
// the edited source and routinely exceeds it. Parking a *playing* evaluator in the past froze
// it for the same reason as above, so a playing evaluator must resume in the present.
test('Mirroring a playing evaluator resumes it in the present', () => {
    const source = new Source('test', 'Time()');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    evaluator.start();

    // Record an input so mirror() takes its replay branch.
    const stream = Array.from(evaluator.streamsByCreator.values())[0]?.[0];
    expect(stream).not.toBeUndefined();
    for (let i = 1; i <= 3; i++) {
        stream!.add(Time.make(source, i), null);
        evaluator.flush();
    }
    expect(evaluator.hasInputHistory()).toBe(true);
    expect(evaluator.isPlaying()).toBe(true);

    // Edit the source, as a creator typing while the project plays does. The longer program
    // takes more steps, so the replacement's step count exceeds the prior evaluator's index —
    // which is what used to rewind the replacement into a past it then sat frozen in.
    const edited = project.withSource(
        source,
        new Source(
            'test',
            'x: Time()\n5 → [].translate(ƒ(i) Phrase("あ".repeat(i)))',
        ),
    );
    const replacement = new Evaluator(
        edited,
        DB,
        [DefaultLocale],
        false,
        evaluator,
    );
    expect(replacement.isPlaying()).toBe(true);
    expect(replacement.isInPast()).toBe(false);
    expect(
        replacement.getLatestSourceValue(replacement.getMain()),
    ).toBeDefined();

    evaluator.stop();
    replacement.stop();
});

// step() set its re-entrancy flag before bailing on an empty stack, so it never cleared it and
// every later step reported a bogus "Already stepping" error.
test('Stepping an empty stack does not poison the re-entrancy guard', () => {
    const source = new Source('test', '1 + 1');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    evaluator.pause();
    evaluator.start();
    let safety = 0;
    while (!evaluator.isDone() && safety++ < 500) evaluator.step();

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    // The first step finds an empty stack; the second must not report re-entrancy.
    evaluator.step();
    evaluator.step();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();

    evaluator.stop();
});
