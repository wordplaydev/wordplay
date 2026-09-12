// `conceptGroups` first, deliberately: ConceptIndex reaches Database through
// HowToDatabase, and importing it before something that initializes Database hits the
// cycle ("HowToDatabase is not a constructor"). The peer tests in this directory import
// in this order for the same reason.
import { getConceptGroups } from '@components/concepts/conceptGroups';
import ConceptIndex from '@concepts/ConceptIndex';
import { Purpose } from '@concepts/Purpose';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import { dependencyKey } from '@nodes/Borrow';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

const locales = DefaultLocales;

function projectBorrowing(code: string, kitCode: string) {
    const kit = new Source('colors', kitCode);
    return Project.make(
        null,
        't',
        new Source('main', code),
        [],
        DefaultLocale,
    ).withDependencies(
        new Map([
            [
                dependencyKey({ username: 'amy', name: 'colors' }, 1),
                { status: 'loaded', source: kit, kit: 'kit1', version: 1 },
            ],
        ]),
    );
}

function kitConceptNames(project: Project): string[] {
    return ConceptIndex.make(project, locales, undefined, undefined)
        .getPrimaryConceptsWithPurpose(Purpose.Kit)
        .map((concept) => concept.getName(locales, false));
}

test("a borrowed kit's exports are documented", () => {
    const project = projectBorrowing(
        `↓ @amy/colors 1\nsunset`,
        `¶Warm.¶\n↑ sunset/en: 1\n↑ ƒ fade(c•#) c`,
    );
    expect(kitConceptNames(project)).toContain('sunset');
    expect(kitConceptNames(project)).toContain('fade');
});

test("a kit's private helpers are not documented", () => {
    // They are not in scope for whoever borrowed the kit, so offering them would put
    // names in the guide that cannot be written.
    const project = projectBorrowing(
        `↓ @amy/colors 1\nsunset`,
        `↑ sunset/en: 1\nhelper: 2\nƒ secret() 3`,
    );
    expect(kitConceptNames(project)).toContain('sunset');
    expect(kitConceptNames(project)).not.toContain('helper');
    expect(kitConceptNames(project)).not.toContain('secret');
});

test('a project that borrows nothing has no kit concepts', () => {
    const project = Project.make(
        null,
        't',
        new Source('main', `1 + 1`),
        [],
        DefaultLocale,
    );
    expect(kitConceptNames(project)).toEqual([]);
});

test("a kit's exports are separate from the project's own", () => {
    // A creator should be able to tell what they wrote from what they borrowed.
    const project = projectBorrowing(
        `↓ @amy/colors 1\nmine: 5\nsunset`,
        `↑ sunset/en: 1`,
    );
    const index = ConceptIndex.make(project, locales, undefined, undefined);
    const own = index
        .getPrimaryConceptsWithPurpose(Purpose.Project)
        .map((c) => c.getName(locales, false));
    expect(own).toContain('mine');
    expect(own).not.toContain('sunset');
    expect(kitConceptNames(project)).toEqual(['sunset']);
});

test('the kit group is what the guide and docs tile render', () => {
    // getConceptGroups is shared by the guide, the project's docs tile, and the
    // Wellspring, so one branch serves all three.
    const project = projectBorrowing(
        `↓ @amy/colors 1\nsunset`,
        `↑ sunset/en: 1`,
    );
    const index = ConceptIndex.make(project, locales, undefined, undefined);
    const groups = getConceptGroups(Purpose.Kit, index, project);
    expect(groups).toHaveLength(1);
    expect(groups[0].concepts.map((c) => c.getName(locales, false))).toEqual([
        'sunset',
    ]);
});
