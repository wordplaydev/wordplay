// First, for its side effect on module order. ConceptIndex reaches HowToDatabase, which
// imports Database, which constructs one of every database at module scope — so reaching that
// cycle through ConceptIndex first leaves HowToDatabase undefined and the whole file fails to
// load. Entering through @db resolves it. conceptGroups.test.ts works for the same reason.
import '@db/projects/Projects';
import ConceptIndex from '@concepts/ConceptIndex';
import Project from '@db/projects/Project';
import { Purpose } from '@concepts/Purpose';
import Caret from '@edit/caret/Caret';
import Menu, { RevisionSet } from '@edit/menu/Menu';
import { getEditsAt } from '@edit/menu/PossibleEdits';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import Unit from '@nodes/Unit';
import { expect, test } from 'vitest';

/** The menu a creator would see at a caret offset in this code. */
function menuAt(code: string, position: number) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const revisions = getEditsAt(
        project,
        new Caret(source, position, undefined, undefined),
        undefined,
        DefaultLocales,
    );
    const concepts = ConceptIndex.make(
        project,
        DefaultLocales,
        undefined,
        undefined,
    );
    return new Menu(
        project,
        source,
        position,
        revisions,
        undefined,
        concepts,
        [0, undefined],
        () => true,
    );
}

const header = (set: RevisionSet) => set.getHeader(DefaultLocale);

test('unit suggestions are grouped by kind of measurement', () => {
    // Every unit reports Purpose.Numbers, so grouping on purpose alone produced a single set —
    // and since it was the only purpose present, the menu flattened it into 136 loose items.
    const organization = menuAt('1', 1).getOrganization();
    const sets = organization.filter((entry) => entry instanceof RevisionSet);

    expect(sets.length).toBeGreaterThan(1);
    const headers = sets.map(header);
    for (const expected of ['Time', 'Length', 'Weight', 'Electricity'])
        expect(headers, `expected a ${expected} group`).toContain(expected);

    // No set may be so big that it's the old flat list under a new name.
    for (const set of sets)
        expect(set.size(), `${header(set)} holds ${set.size()}`).toBeLessThan(
            40,
        );
});

test('a unit lands in the group for what it measures', () => {
    const sets = menuAt('1', 1)
        .getOrganization()
        .filter((entry) => entry instanceof RevisionSet);
    const groupOf = (unit: string) =>
        sets.find((set) =>
            set.revisions.some(
                (revision) =>
                    revision.getNewNode(DefaultLocales)?.toWordplay() === unit,
            ),
        );

    expect(groupOf('km')).toBeDefined();
    expect(groupOf('km') && header(groupOf('km')!)).toBe('Length');
    expect(groupOf('ms') && header(groupOf('ms')!)).toBe('Time');
    expect(groupOf('kg') && header(groupOf('kg')!)).toBe('Weight');
    expect(groupOf('Ω') && header(groupOf('Ω')!)).toBe('Electricity');
    // A unit the conversion table doesn't define still needs a home.
    expect(groupOf('beats') && header(groupOf('beats')!)).toBe('Other');
});

test('number suggestions come before the unit groups', () => {
    // They used to be last, after all 126 units.
    const organization = menuAt('1', 1).getOrganization();
    const sets = organization.filter((entry) => entry instanceof RevisionSet);
    const numbers = sets.findIndex((set) =>
        set.revisions.every(
            (revision) =>
                !(revision.getNewNode(DefaultLocales) instanceof Unit),
        ),
    );
    expect(numbers, 'expected a set holding the number suggestions').toBe(0);
    expect(sets[0].purpose).toBe(Purpose.Numbers);
});

test('a set named by its purpose still reads its purpose header', () => {
    // Only sets with a group get their own label; everything else must be unchanged.
    const sets = menuAt('', 0)
        .getOrganization()
        .filter((entry) => entry instanceof RevisionSet);
    const outputs = sets.find((set) => set.purpose === Purpose.Outputs);
    expect(outputs && header(outputs)).toBe(
        DefaultLocale.ui.docs.purposes.Outputs.header,
    );
});
