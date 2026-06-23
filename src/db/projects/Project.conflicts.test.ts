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
            new Source('main', '1 + x'), // unknown name → blocking conflict
            new Source('main', 'y'), // unknown name → blocking conflict
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

    test('a candidate that introduces a blocking conflict is reported; a clean one is not', () => {
        const main = new Source('main', '1 + 1');
        const project = Project.make('p', 'name', main, [], DefaultLocale);

        const clean = new Source('main', '2 + 2');
        const broken = new Source('main', '1 + nope'); // unknown name

        const batch = project.getNewConflictsBatch(main, [clean, broken]);
        expect(batch.get(clean)).toHaveLength(0);
        expect((batch.get(broken) ?? []).length).toBeGreaterThan(0);
    });

    test('borrow fallback: an edit to a donor source surfaces a new conflict in the borrowing source', () => {
        // main borrows `a` from the supplement named `sup`. Shared binds must
        // carry a language tag, hence `a/en`.
        const main = new Source('main', '↓ sup.a\na');
        const donor = new Source('sup', '↑ a/en: 1');
        const project = Project.make('p', 'name', main, [donor], DefaultLocale);

        // The borrow makes sources interdependent, forcing the full-walk path.
        expect(project.hasCrossSourceDependencies()).toBe(true);
        // The starting project resolves the borrow with no blocking conflicts.
        expect(
            project
                .getMajorConflictsNow()
                .filter((conflict) => conflict.isBlocking()),
        ).toHaveLength(0);

        // Replace the donor so it no longer shares `a`; main's borrow breaks.
        const brokenDonor = new Source('sup', '↑ b/en: 1');
        const batch = project.getNewConflictsBatch(donor, [brokenDonor]);

        // The new conflict lives in `main` (the borrower), not the edited donor,
        // so it is only caught because the borrow guard keeps the full walk.
        expect((batch.get(brokenDonor) ?? []).length).toBeGreaterThan(0);
    });
});
