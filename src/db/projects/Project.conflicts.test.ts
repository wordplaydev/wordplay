import type Conflict from '@conflicts/Conflict';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/** Reference implementation: the un-optimized batch that re-walks the WHOLE
 *  project for every candidate. The optimized getNewConflictsBatch must match
 *  this exactly whenever sources are independent (no borrows). */
function referenceBatch(
    project: Project,
    oldSource: Source,
    newSources: Source[],
): Map<Source, Conflict[]> {
    const current = project.getMajorConflictsNow();
    const result = new Map<Source, Conflict[]>();
    for (const newSource of newSources) {
        const next = project
            .withSource(oldSource, newSource)
            .getMajorConflictsNow()
            .filter((conflict) => conflict.isBlocking());
        result.set(
            newSource,
            next.filter(
                (newConflict) =>
                    !current.some((oldConflict) =>
                        oldConflict.isEqualTo(newConflict),
                    ),
            ),
        );
    }
    return result;
}

/** Two conflict lists are equivalent if they pairwise match by isEqualTo. */
function sameConflicts(a: Conflict[], b: Conflict[]): boolean {
    return (
        a.length === b.length &&
        a.every((ac) => b.some((bc) => ac.isEqualTo(bc))) &&
        b.every((bc) => a.some((ac) => ac.isEqualTo(bc)))
    );
}

describe('Project.getNewConflictsBatch optimization', () => {
    test('independent sources: optimized result matches the full-walk reference', () => {
        const main = new Source('main', '1 + 1');
        const supplement = new Source('extra', '2 + 2');
        const project = Project.make(
            'p',
            'name',
            main,
            [supplement],
            DefaultLocale,
        );

        // No borrows, so the fast path is taken.
        expect(project.hasCrossSourceDependencies()).toBe(false);

        const candidates = [
            new Source('main', '2 + 2'), // clean
            new Source('main', '1 + )'), // unparsable → blocking conflict
            new Source('main', 'y'), // unknown name → permitted warning
        ];

        const optimized = project.getNewConflictsBatch(main, candidates);
        const reference = referenceBatch(project, main, candidates);

        for (const candidate of candidates)
            expect(
                sameConflicts(
                    optimized.get(candidate) ?? [],
                    reference.get(candidate) ?? [],
                ),
            ).toBe(true);
    });

    test('a candidate that introduces a blocking conflict is reported; semantic mistakes are not', () => {
        const main = new Source('main', '1 + 1');
        const project = Project.make('p', 'name', main, [], DefaultLocale);

        const clean = new Source('main', '2 + 2');
        const broken = new Source('main', '1 + )'); // unparsable — the one blocking conflict
        const mistyped = new Source('main', '1 + nope'); // unknown name — permitted warning

        const batch = project.getNewConflictsBatch(main, [
            clean,
            broken,
            mistyped,
        ]);
        expect(batch.get(clean)).toHaveLength(0);
        expect((batch.get(broken) ?? []).length).toBeGreaterThan(0);
        expect(batch.get(mistyped)).toHaveLength(0);
    });

    test('borrow fallback: a donor edit still matches the full-walk reference', () => {
        // main borrows `a` from the supplement named `sup`. Shared binds must
        // carry a language tag, hence `a/en`.
        const main = new Source('main', '↓ sup.a\na');
        const donor = new Source('sup', '↑ a/en: 1');
        const project = Project.make('p', 'name', main, [donor], DefaultLocale);

        // The borrow makes sources interdependent, forcing the full-walk path.
        expect(project.hasCrossSourceDependencies()).toBe(true);

        // Replace the donor so it no longer shares `a`; main's borrow now has an
        // UnknownBorrow — a semantic conflict, so it warns rather than blocks, and
        // the batch reports nothing. The full-walk path must still agree with the
        // reference implementation; it remains the correctness guard should any
        // cross-source conflict ever become blocking again.
        const brokenDonor = new Source('sup', '↑ b/en: 1');
        const batch = project.getNewConflictsBatch(donor, [brokenDonor]);
        const reference = referenceBatch(project, donor, [brokenDonor]);
        expect(
            sameConflicts(
                batch.get(brokenDonor) ?? [],
                reference.get(brokenDonor) ?? [],
            ),
        ).toBe(true);
        expect(batch.get(brokenDonor)).toHaveLength(0);
    });

    test('editing the borrower itself still takes the fast path', () => {
        // The shape a MIDI import makes: a small program that borrows a source
        // nothing else reads. Asking whether *any* source borrows answers yes
        // here and re-walks every note in the donor to validate a keystroke —
        // so the question has to be whether anything borrows the source being
        // edited, which nothing does.
        const main = new Source('main', '↓ sup.a\na');
        const donor = new Source('sup', '↑ a/en: 1');
        const project = Project.make('p', 'name', main, [donor], DefaultLocale);

        expect(project.hasSourcesDependingOn(main)).toBe(false);
        expect(project.hasSourcesDependingOn(donor)).toBe(true);

        // And the fast path must still answer what the full walk answers.
        const candidates = [
            new Source('main', '↓ sup.a\na + 1'),
            new Source('main', '↓ sup.a\na + nope'),
        ];
        const optimized = project.getNewConflictsBatch(main, candidates);
        const reference = referenceBatch(project, main, candidates);
        for (const candidate of candidates)
            expect(
                sameConflicts(
                    optimized.get(candidate) ?? [],
                    reference.get(candidate) ?? [],
                ),
                candidate.code.toString(),
            ).toBe(true);
    });
});
