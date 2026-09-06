import DefaultLocale from '@locale/DefaultLocale';
import { describe, expect, test } from 'vitest';
import { TourKeys, tourExampleProblems } from './tourExamples';

/**
 * The landing page's tour examples, compiled.
 *
 * The locale verifier can't do this one: `docExamples.isNonProgram` treats any
 * example containing `¶` as a meta-example — a doc demonstrating doc syntax,
 * whose prose would tokenize into spurious `UnknownName`s — and skips it. Every
 * tour example contains a `¶doc¶` by design, so all ten fall through that hole.
 * This is the check that fills it, and it is what will catch a machine
 * translation that renamed something into a program that no longer runs.
 *
 * Analyzing is not enough on its own: a program can be conflict-free and still
 * put nothing on stage. `Showcase.svelte` renders these through OutputPreview,
 * so what matters is that they evaluate without an exception too — but that
 * needs an Evaluator, and a stage's content depends on things Node doesn't have
 * (Contour's outlines need the browser's font loading). So this checks what is
 * environment-independent: every example parses to exactly one program, and that
 * program analyzes without conflicts.
 *
 * This file covers en-US only and stays in the default run, because what it
 * exercises — `parseLocaleDoc`, `Project.make`, `analyze()` — is code an ordinary
 * edit can break. The same nine examples in the other 30 locales are corpus, cost
 * ~17s, and live in Showcase.locales.test.ts, which runs in the `sweep` project.
 */

describe('en-US tour examples', () => {
    test.each(TourKeys)('%s compiles', (key) => {
        expect(tourExampleProblems(DefaultLocale, key)).toEqual([]);
    });
});
