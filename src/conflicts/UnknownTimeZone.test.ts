import { expect, test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnknownTimeZone from '@conflicts/UnknownTimeZone';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Evaluate from '@nodes/Evaluate';
import Source from '@nodes/Source';

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
        .getAnalysis()
        .conflicts.filter((conflict) => conflict instanceof UnknownTimeZone);
    expect(conflicts).toHaveLength(1);
    const resolutions = conflicts[0].getResolutions(context, []);
    expect(resolutions[0].kind).toBe('repair');
    if (resolutions[0].kind !== 'repair') return;
    // The top suggestion for 'tokyo' is Asia/Tokyo; applying it fixes the program.
    const description = resolutions[0]
        .description(DefaultLocales, context)
        .toText();
    expect(description).toContain('Asia/Tokyo');
    const { newProject } = resolutions[0].mediator(context, DefaultLocales);
    newProject.analyze();
    expect(
        newProject
            .getAnalysis()
            .conflicts.filter((c) => c instanceof UnknownTimeZone),
    ).toHaveLength(0);
    expect(newProject.getSources()[0].toWordplay()).toContain('Asia/Tokyo');
});
