import Templates from '@concepts/Templates';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';
import ExceptionValue from '@values/ExceptionValue';
import { describe, expect, test } from 'vitest';

import { SEED_PROJECTS, type SeedProject } from './seedProjects';

function makeProject({ id, name, code }: SeedProject): Project {
    return Project.make(id, name, new Source('start', code), [], DefaultLocale);
}

/**
 * The emulator seed programs are real Wordplay, but nothing runs them until
 * someone opens the emulator and clicks into a project — by which point a typo
 * or a type error looks like a broken app rather than a broken seed. This
 * mirrors src/examples/examples.test.ts so a bad seed program fails `npm test`
 * instead.
 */

test.each(SEED_PROJECTS)('$name has no conflicts', (seed) => {
    const { name } = seed;
    const project = makeProject(seed);
    project.analyze();

    const context = project.getContext(project.getMain());
    const conflicts = Array.from(
        project.analyze().conflictedNodes.values(),
    ).flat();
    const messages = conflicts.map((conflict) =>
        conflict
            .getMessage(context, Templates)
            .explanation(DefaultLocales, context)
            .toText(),
    );

    expect(
        conflicts,
        `Unexpected conflicts in "${name}":\n${messages.join('\n')}`,
    ).toHaveLength(0);
});

test.each(SEED_PROJECTS)('$name renders something on stage', (seed) => {
    // Conflict-free isn't the same as working: a program can type-check and
    // still throw at runtime or evaluate to nothing at all, which shows up in
    // the emulator as an empty stage. Evaluate each one and insist it produced
    // renderable output.
    const project = makeProject(seed);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    try {
        evaluator.getInitialValue();
        expect(evaluator.exception).toBeUndefined();

        const value = evaluator.getLatestSourceValue(project.getMain());
        expect(value).toBeDefined();
        expect(value).not.toBeInstanceOf(ExceptionValue);
        expect(
            value === undefined ? undefined : toStage(evaluator, value),
            `"${seed.name}" evaluated to something with nothing to render`,
        ).toBeDefined();
    } finally {
        evaluator.stop();
    }
});

describe('seed project metadata', () => {
    test('IDs and names are unique, so search and previews have distinct things to show', () => {
        expect(new Set(SEED_PROJECTS.map((p) => p.id)).size).toBe(
            SEED_PROJECTS.length,
        );
        expect(new Set(SEED_PROJECTS.map((p) => p.name)).size).toBe(
            SEED_PROJECTS.length,
        );
    });

    test('seed-project-00 exists, since seedChats keys the moderation queue to it', () => {
        expect(SEED_PROJECTS.some((p) => p.id === 'seed-project-00')).toBe(
            true,
        );
    });
});
