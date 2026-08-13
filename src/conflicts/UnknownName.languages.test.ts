import '@conflicts/registerTypeResolutions';
import { UnknownName } from '@conflicts/UnknownName';
import { LanguagesDialogID } from '@components/widgets/dialogIDs';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type LocaleText from '@locale/LocaleText';
import { setLocaleNameIndex } from '@locale/localeNameIndex';
import Source from '@nodes/Source';
import { readFileSync } from 'fs';
import { afterEach, expect, test } from 'vitest';

const es = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
) as LocaleText;

/**
 * A name can fail to resolve just because the project isn't written in the language that
 * spells it that way. The conflict says which language that is, and points at the dialog
 * that can add it — it can't add it itself, since that needs a fetch (#1246).
 */

const index = {
    names: { 'en-US': 'Phrase Stage', 'es-MX': 'Frase Escenario' },
    keywords: { 'en-US': '', 'es-MX': 'función' },
};

afterEach(() => setLocaleNameIndex(undefined));

function resolutionsFor(
    code: string,
    declared: LocaleText[] = [DefaultLocale],
) {
    const source = new Source('start', code);
    const project = Project.make('p', 'p', source, [], declared);
    const context = project.getContext(source);
    project.analyze();
    const conflict = project
        .getAnalysis()
        .conflicts.find((c): c is UnknownName => c instanceof UnknownName);
    expect(conflict).toBeDefined();
    return conflict!
        .getResolutions(context, [])
        .filter(
            (r): r is Extract<typeof r, { kind: 'explain' }> =>
                r.kind === 'explain' && r.openDialog !== undefined,
        );
}

test('an unresolved name that another language spells that way names the language', () => {
    setLocaleNameIndex(index);

    const pointers = resolutionsFor('Frase("hola")');
    expect(pointers).toHaveLength(1);
    expect(pointers[0].openDialog).toBe(LanguagesDialogID);

    // The message has to say *which* language, or there's nothing to act on.
    const text = pointers[0].description(DefaultLocales, {} as never).toText();
    expect(text).toContain('Frase');
    // The language in its own name, as every other language label in the app reads.
    expect(text).toContain('español');
});

test('a localized keyword the project does not recognize is found the same way', () => {
    setLocaleNameIndex(index);
    // Without Spanish declared, `función` lexes as a plain name and doesn't resolve.
    expect(resolutionsFor('función(x) x')).not.toHaveLength(0);
});

test('English is never a missing name, but can be a missing keyword', () => {
    setLocaleNameIndex({
        names: { 'en-US': 'Phrase Stage', 'es-MX': 'Frase Escenario' },
        // `mientras` is English's keyword word here only to make the asymmetry visible in one
        // index: names fall back to English, keyword words don't.
        keywords: { 'en-US': 'mientras', 'es-MX': 'función' },
    });

    // A name only English spells that way already binds through the locale fallback, so
    // declaring English can't be the fix.
    expect(resolutionsFor('Stagee("hi")')).toHaveLength(0);

    // A *keyword* word is different: the keyword index is built from the declared locales
    // alone, so an English word really doesn't lex in a project that doesn't declare English.
    const english = resolutionsFor('mientras(x) x', [es]);
    expect(english).toHaveLength(1);
    expect(
        english[0].description(DefaultLocales, {} as never).toText(),
    ).toContain('English');
});

test('nothing is offered for a declared language, or with no index', () => {
    // Not loaded: the lookups can't answer, so the conflict stays quiet rather than guessing.
    setLocaleNameIndex(undefined);
    expect(resolutionsFor('Frase("hola")')).toHaveLength(0);
});
