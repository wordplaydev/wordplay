import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { DB } from '@db/Database';

/**
 * A supplement nothing borrows is still evaluated, so its own tile can show
 * what it evaluates to. That is cheap for a page of code and very expensive for
 * an imported song: tens of thousands of steps on every evaluator rebuild, to
 * rebuild a value the previous evaluator already had, for a source the creator
 * isn't even looking at.
 *
 * So a rebuild reuses the previous value when the source cannot have evaluated
 * to anything else. The tests below are as much about when it must NOT reuse.
 */

function projectWith(supplement: string, main = 'Phrase("hi")') {
    const mainSource = new Source('start', main);
    const extra = new Source('extra', supplement);
    return {
        main: mainSource,
        extra,
        project: Project.make('p', 'p', mainSource, [extra], DefaultLocale),
    };
}

/** Evaluate, then rebuild the way ProjectView does, mirroring the prior. */
function rebuild(project: Project) {
    const first = new Evaluator(project, DB, [DefaultLocale], true);
    first.getInitialValue();
    const second = new Evaluator(project, DB, [DefaultLocale], true, first);
    second.getInitialValue();
    return { first, second };
}

test('a stable unused supplement keeps its value across a rebuild', () => {
    const { extra, project } = projectWith('[1 2 3]');
    const { first, second } = rebuild(project);

    // The value is still there to show, and it is the one we already had.
    expect(first.getLatestSourceValue(extra)?.toString()).toBe('[1 2 3]');
    expect(second.getLatestSourceValue(extra)?.toString()).toBe('[1 2 3]');
    expect(second.carriedSourceValues.get(extra)).toBeDefined();
});

test('a rebuild does not re-run a stable unused supplement', () => {
    // The point of the whole thing: the steps are not run again. Sized so the
    // difference is unmistakable rather than a timing judgement.
    const many = `[${Array.from({ length: 400 }, (_, i) => `${i} + 1`).join(' ')}]`;
    const { project } = projectWith(many);
    const { first, second } = rebuild(project);
    expect(first.getStepIndex()).toBeGreaterThan(400);
    expect(second.getStepIndex()).toBeLessThan(first.getStepIndex() / 4);
});

test('a rebuild reuses compiled steps rather than recompiling', () => {
    // Independent of the value carry above, and the larger half of a rebuild:
    // compiling an imported song was ~170ms of a ~210ms rebuild. Steps are keyed
    // by definition identity, so every definition the edit left alone still has
    // the steps it had.
    const { project } = projectWith('[1 2 3]');
    const first = new Evaluator(project, DB, [DefaultLocale], true);
    first.getInitialValue();
    expect(first.steps.size).toBeGreaterThan(0);

    const second = new Evaluator(project, DB, [DefaultLocale], true, first);
    let carried = 0;
    for (const [definition, steps] of first.steps)
        if (project.contains(definition)) {
            expect(second.steps.get(definition)).toBe(steps);
            carried++;
        }
    expect(carried).toBeGreaterThan(0);
});

test('a supplement that could tick is always re-evaluated', () => {
    // Evaluating a stream definition is what creates the stream. Skipping it
    // would mean the stream never exists, so this must never be reused.
    const { extra, project } = projectWith('Time()');
    expect(project.isStableSource(extra)).toBe(false);
    const { second } = rebuild(project);
    expect(second.carriedSourceValues.has(extra)).toBe(false);
});

test('a supplement that could roll is always re-evaluated', () => {
    // Random draws from the evaluator's generator; reusing a value would both
    // freeze it and shift the sequence every other source sees.
    const { extra, project } = projectWith('Random(1 10)');
    expect(project.isStableSource(extra)).toBe(false);
});

test('a supplement that borrows is always re-evaluated', () => {
    // What it borrows may have changed even when it did not.
    const mainSource = new Source('start', '↑ a/en: 1');
    const extra = new Source('extra', '↓ start.a\na');
    const project = Project.make(
        'p',
        'p',
        mainSource,
        [extra],
        DefaultLocale,
    );
    expect(project.isStableSource(extra)).toBe(false);
});

test('a borrowed supplement is not carried, since it is not unused', () => {
    // It feeds main, so main's value depends on running it.
    const mainSource = new Source('start', '↓ extra\nextra');
    const extra = new Source('extra', '[1 2 3]');
    const project = Project.make(
        'p',
        'p',
        mainSource,
        [extra],
        DefaultLocale,
    );
    expect(project.getUnusedSupplements()).toHaveLength(0);
    const { second } = rebuild(project);
    expect(second.carriedSourceValues.has(extra)).toBe(false);
    expect(second.getLatestSourceValue(mainSource)?.toString()).toBe('[1 2 3]');
});

test('an edited supplement is re-evaluated, not carried', () => {
    // Identity is the whole test: the carried values are keyed by Source, and
    // an edit makes a new one, so there is nothing to find.
    const { extra, project } = projectWith('[1 2 3]');
    const first = new Evaluator(project, DB, [DefaultLocale], true);
    first.getInitialValue();

    const changed = extra.withCode('[4 5 6]');
    const revised = project.withSource(extra, changed);
    const second = new Evaluator(revised, DB, [DefaultLocale], true, first);
    second.getInitialValue();

    expect(second.getLatestSourceValue(changed)?.toString()).toBe('[4 5 6]');
});
