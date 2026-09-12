import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { kitNeedsTranslation, withoutLanguage } from './verifyKits';

const kit = `¶A kit.¶
¶Un kit.¶/es
0
¶Letters.¶
¶Letras.¶/es
↑ latin/en,latín/es: 'abc'/en → ['']`;

function sourceOf(code: string) {
    return new Source('k/en', code);
}

test('a kit owes a locale nothing once every export and doc has it', () => {
    expect(kitNeedsTranslation(sourceOf(kit), 'es')).toBe(false);
    expect(kitNeedsTranslation(sourceOf(kit), 'fr')).toBe(true);
});

test('an untagged doc is the source language own copy, not a debt', () => {
    // English is never owed a translation of prose it wrote, which is what this
    // claimed for every kit until untagged docs were read as the source's own.
    expect(kitNeedsTranslation(sourceOf(kit), 'en')).toBe(false);
});

test('stripping a language leaves every other language and the code alone', () => {
    // The redo path: add mode skips what already carries the target language, so
    // re-translating means removing it first.
    const project = Project.make(null, 'k', sourceOf(kit), [], DefaultLocale);
    const out = withoutLanguage(project, 'es').getMain().getCode().toString();

    expect(out).not.toContain('latín');
    expect(out).not.toContain('Letras');
    expect(out).not.toContain('Un kit');
    // Everything else survives: the English names and docs, and the data.
    expect(out).toContain('latin/en');
    expect(out).toContain('Letters.');
    expect(out).toContain('A kit.');
    expect(out).toContain(`'abc'/en`);
    // And the kit now owes Spanish again, which is the point.
    expect(kitNeedsTranslation(sourceOf(out), 'es')).toBe(true);
});

test('stripping a language a kit does not have changes nothing', () => {
    const project = Project.make(null, 'k', sourceOf(kit), [], DefaultLocale);
    expect(withoutLanguage(project, 'fr').getMain().getCode().toString()).toBe(
        kit,
    );
});
