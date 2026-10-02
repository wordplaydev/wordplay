import { expect, test } from 'vitest';
import Project from '#db/projects/Project.ts';
import Source from '#nodes/Source.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import freshSourceName from '#edit/freshSourceName.ts';

function project(main: string, ...supplements: [string, string][]) {
    return Project.make(
        null,
        'p',
        new Source('main', main),
        supplements.map(([name, code]) => new Source(name, code)),
        DefaultLocale,
    );
}

test('a name nothing uses is kept', () => {
    expect(freshSourceName(project(`1`), 'picture')).toBe('picture');
});

test('a name another source has is numbered', () => {
    // Importing twice gives two sources, not one shadowing the other.
    expect(freshSourceName(project(`1`, ['song', `1`]), 'song')).toBe('song2');
    expect(
        freshSourceName(project(`1`, ['song', `1`], ['song2', `1`]), 'song'),
    ).toBe('song3');
});

test('a name a bind has is numbered', () => {
    // A source is found before a share, so a source named like a bind would hide it.
    expect(freshSourceName(project(`colors: 1\ncolors`), 'colors')).toBe(
        'colors2',
    );
});

test('a name the basis has is numbered', () => {
    // A source named `Color` broke every `Color(…)` in the program that borrowed it.
    expect(freshSourceName(project(`1`), 'Color')).toBe('Color2');
});
