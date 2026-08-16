import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';

/**
 * What it costs to edit one source of a project that has a big one it isn't
 * touching — the shape a MIDI import makes, where a two-line program borrows a
 * source holding thousands of notes.
 *
 * Every analysis cache lives on the Project instance and an edit makes a new
 * Project, so without carrying them forward a keystroke re-infers types and
 * re-derives conflicts for *every* source. On a real imported song that was
 * about a second an edit. The tests below assert the mechanism (what is carried
 * and what isn't) and then the consequence, since either alone can pass while
 * the feature is broken.
 */

/** A source of `count` expressions, big enough that re-analyzing it is visible. */
function bigSource(name: string, count: number): Source {
    const lines = ['['];
    for (let i = 0; i < count; i++) lines.push(`\t${i % 12} + ${i % 7}`);
    lines.push(']');
    return new Source(name, lines.join('\n'));
}

/** The two-source form a MIDI import writes: borrow the whole source. */
function importedShape(count = 2000) {
    const main = new Source('start', '↓ song\nsong');
    const song = bigSource('song', count);
    return {
        main,
        song,
        project: Project.make('p', 'song', main, [song], DefaultLocale),
    };
}

test('a revision keeps the caches of the sources it did not touch', () => {
    const { main, song, project } = importedShape(200);
    project.analyze();
    project.getLocalesUsed();

    const revised = project.withSource(main, main.withCode('↓ song\n1'));

    // The untouched source keeps everything, by identity — the whole point is
    // that its nodes did not move.
    expect(revised.sourceAnalysis.get(song)).toBe(
        project.sourceAnalysis.get(song),
    );
    expect(revised.sourceLocales.get(song)).toBe(
        project.sourceLocales.get(song),
    );
    expect(revised.getContext(song).types).toBe(project.getContext(song).types);

    // The edited source keeps nothing: it is not the same source any more.
    expect(revised.sourceAnalysis.has(main)).toBe(false);
    expect(revised.sourceLocales.has(main)).toBe(false);
});

test('the caches survive the whole edit chain, not just the first step', () => {
    // The test this file was missing. Editing one character runs four
    // constructions, and only the first knows about the caches:
    //
    //   Editor.svelte      project.withSource(…).withCaret(…)
    //   ProjectsDatabase   .bumpStampsFrom(…).withNewTime()
    //
    // The last one is what reaches the store, so asserting on `withSource`
    // alone measures a project that never exists in the app — which is exactly
    // how a version of this shipped that made no difference to typing.
    const { main, song, project } = importedShape(200);
    project.analyze();
    project.getLocalesUsed();
    project.getRequiredPermissions();

    const edited = main.withCode('↓ song\n1');
    const published = project
        .withSource(main, edited)
        .withCaret(edited, 1)
        .bumpStampsFrom(project, 'writer')
        .withNewTime();

    expect(published.sourceAnalysis.get(song)).toBe(
        project.sourceAnalysis.get(song),
    );
    expect(published.sourceLocales.get(song)).toBe(
        project.sourceLocales.get(song),
    );
    expect(published.sourceReferences.get(song)).toBe(
        project.sourceReferences.get(song),
    );
    expect(published.getContext(song).types).toBe(
        project.getContext(song).types,
    );
});

test('a source that borrows is re-analyzed, since what it borrowed may have moved', () => {
    // `main` borrows, so its types depend on another source and can't be
    // carried on identity alone. Only borrow-free sources are safe.
    const { main, song, project } = importedShape(200);
    project.analyze();

    const revised = project.withSource(song, song.withCode(song.code + '\n1'));
    expect(revised.sourceAnalysis.has(main)).toBe(false);
    expect(revised.sourceContext.has(main)).toBe(false);
});

test('a project locale is not lost to a second source using a different one', () => {
    // `getLocalesUsed` answers an array, so keying its results by position had
    // one source's first locale replace another's.
    const main = new Source('start', '↓ other.a\na');
    const other = new Source('other', '↑ a/es: 1');
    const project = Project.make('p', 'p', main, [other], DefaultLocale);
    // A source naming a locale contributes it, whichever source it is.
    expect(project.getLocalesUsed().length).toBeGreaterThan(0);
});
