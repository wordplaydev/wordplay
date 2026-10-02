import { expect, test } from 'vitest';
import { testConflict } from '#conflicts/TestUtilities.ts';
import UnknownTimeZone from '#conflicts/UnknownTimeZone.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import Evaluate from '#nodes/Evaluate.ts';
import Source from '#nodes/Source.ts';
import { must } from '#util/nullable.ts';

test.each([
    // Valid zones pass; literal typos and city names conflict.
    ["Now(1s 'Asia/Tokyo')", "Now(1s 'Tokyo')"],
    ["Moment(timezone: 'America/New_York')", "Moment(timezone: 'new york')"],
    // Computed time zones can't be checked statically: no conflict.
    ["Now(1s 'Asia/' + 'Nowhere')", "Now(1s 'nowhere')"],
])('no conflict for %s, conflict for %s', (good, bad) => {
    testConflict(good, bad, Evaluate, UnknownTimeZone);
});

test('The conflict offers a click-to-fix repair that resolves it', () => {
    const source = new Source('test', "Now(1s 'tokyo')");
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const context = project.getContext(source);
    const conflicts = project
        .analyze()
        .conflicts.filter((conflict) => conflict instanceof UnknownTimeZone);
    expect(conflicts).toHaveLength(1);
    const resolutions = must(conflicts[0], 'a conflict').getResolutions(
        context,
        [],
    );
    const resolution = must(resolutions[0], 'a resolution');
    expect(resolution.kind).toBe('repair');
    if (resolution.kind !== 'repair') return;
    // The top suggestion for 'tokyo' is Asia/Tokyo; applying it fixes the program.
    const description = resolution
        .description(DefaultLocales, context)
        .toText();
    expect(description).toContain('Asia/Tokyo');
    const { newProject } = resolution.mediator(context, DefaultLocales);
    newProject.analyze();
    expect(
        newProject
            .analyze()
            .conflicts.filter((c) => c instanceof UnknownTimeZone),
    ).toHaveLength(0);
    expect(
        must(newProject.getSources()[0], 'the revised source').toWordplay(),
    ).toContain('Asia/Tokyo');
});
