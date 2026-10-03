// First, for its side effect on module order. ConceptIndex reaches HowToDatabase, which
// imports Database, which constructs one of every database at module scope — so reaching that
// cycle through ConceptIndex first leaves HowToDatabase undefined and the whole file fails to
// load. Entering through #db resolves it. conceptGroups.test.ts works for the same reason.
import '#db/projects/Projects.ts';
import ConceptIndex from '#concepts/ConceptIndex.ts';
import Project from '#db/projects/Project.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Caret from '#edit/caret/Caret.ts';
import Menu, { liveMenuFollows, RevisionSet } from '#edit/menu/Menu.ts';
import { getEditsAt } from '#edit/menu/PossibleEdits.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Reference from '#nodes/Reference.ts';
import Replace from '#edit/revision/Replace.ts';
import Source from '#nodes/Source.ts';
import Unit from '#nodes/Unit.ts';
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
        [],
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
    expect(sets[0]!.purpose).toBe(Purpose.Numbers);
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

test('a submenu selection cannot go before its first item', () => {
    // `-1` once meant "back", but nothing was rendered for it, so focus and
    // the active descendant pointed at nothing.
    const menu = menuAt('1', 1);
    const set = menu
        .getOrganization()
        .findIndex((item) => item instanceof RevisionSet);
    expect(set).toBeGreaterThanOrEqual(0);
    const inside = menu.withSelection([set, 0]);
    expect(inside.up().getSelectionIndex()).toEqual([set, 0]);
});

test('a submenu selection is clamped to its last item', () => {
    const menu = menuAt('1', 1);
    const set = menu
        .getOrganization()
        .findIndex((item) => item instanceof RevisionSet);
    const entry = menu.getOrganization()[set];
    if (!(entry instanceof RevisionSet)) throw new Error('no set');
    expect(menu.withSelection([set, 999]).getSelectionIndex()).toEqual([
        set,
        entry.size() - 1,
    ]);
});

test('Home and End reach the ends of the current list', () => {
    const menu = menuAt('1', 1);
    expect(menu.toEnd().getSelectionIndex()).toEqual([
        menu.getOrganization().length - 1,
        undefined,
    ]);
    expect(menu.toEnd().toStart().getSelectionIndex()).toEqual([0, undefined]);
});

test('replacing a reference with a differently named one is not a completion', () => {
    // isCompletion compared a name to itself, so every such replacement was
    // promoted to the top of the menu as if it completed what was typed.
    const source = new Source('test', 'ab: 1\nxy: 2\nab');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const reference = source
        .nodes()
        .filter((node) => node instanceof Reference)
        .at(-1);
    if (reference === undefined) throw new Error('no reference');
    const revisions = getEditsAt(
        project,
        new Caret(source, reference, undefined, undefined),
        undefined,
        DefaultLocales,
    );
    const toXY = revisions.find(
        (revision) =>
            revision instanceof Replace &&
            revision.getNewNode(DefaultLocales)?.toWordplay() === 'xy',
    );
    expect(toXY).toBeDefined();
    expect(toXY?.isCompletion(DefaultLocales)).toBe(false);
});

test('a live menu stays live as its selection moves', () => {
    const source = new Source('test', '1');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const concepts = ConceptIndex.make(
        project,
        DefaultLocales,
        undefined,
        undefined,
    );
    const live = new Menu(
        project,
        source,
        1,
        getEditsAt(
            project,
            new Caret(source, 1, undefined, undefined),
            undefined,
            DefaultLocales,
        ),
        [],
        undefined,
        concepts,
        [0, undefined],
        () => true,
        true,
    );
    expect(live.isLive()).toBe(true);
    expect(live.down().isLive()).toBe(true);
    expect(live.toEnd().isLive()).toBe(true);
    expect(live.getID()).toBe('test-menu');
});

/** A menu over `1` at its end, live or not, with nothing selected if live. */
function menuOver(live: boolean) {
    const source = new Source('test', '1');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return new Menu(
        project,
        source,
        1,
        getEditsAt(
            project,
            new Caret(source, 1, undefined, undefined),
            undefined,
            DefaultLocales,
        ),
        [],
        undefined,
        ConceptIndex.make(project, DefaultLocales, undefined, undefined),
        [live ? -1 : 0, undefined],
        () => true,
        live,
    );
}

test('a live menu opens with nothing selected, and Down enters it', () => {
    // Enter must stay a new line until the creator steps into the menu.
    const menu = menuOver(true);
    expect(menu.hasSelection()).toBe(false);
    const entered = menu.down();
    expect(entered.getSelectionIndex()).toEqual([0, undefined]);
    expect(entered.hasSelection()).toBe(true);
    expect(entered.down().getSelectionIndex()).toEqual([1, undefined]);
});

test('Up from a live menu\u2019s first item leaves it; Up again stays out', () => {
    const left = menuOver(true).down().up();
    expect(left.hasSelection()).toBe(false);
    expect(left.up().hasSelection()).toBe(false);
});

test('Down stops at the last item', () => {
    const end = menuOver(true).toEnd();
    expect(end.down().getSelectionIndex()).toEqual(end.getSelectionIndex());
});

test('a menu that takes focus always has a selection', () => {
    const menu = menuOver(false);
    expect(menu.hasSelection()).toBe(true);
    expect(menu.up().getSelectionIndex()).toEqual([0, undefined]);
    expect(menu.withSelection([-1, undefined]).getSelectionIndex()).toEqual([
        0,
        undefined,
    ]);
});

test.each<[string, string, number, string, number, boolean]>([
    ['typing extends the name', 'Ph', 2, 'Phr', 3, true],
    ['the first letter of a new name', '', 0, 'P', 1, true],
    ['deleting back to the start', 'Ph', 2, 'P', 1, true],
    ['deleting the whole name', 'Ph', 2, '', 0, false],
    ['a character that ends the name', 'Ph', 2, 'Ph(', 3, false],
    ['moving to another token', 'Ph 1', 2, 'Ph 1', 4, false],
])('a live menu follows %s', (_, before, anchor, after, position, expected) => {
    // A position at a name's end is "at" the token after it, so the rule must
    // look back one position too; without that, typing closed every menu.
    expect(
        liveMenuFollows(
            anchor,
            new Source('test', before),
            new Source('test', after),
            position,
        ),
    ).toBe(expected);
});
