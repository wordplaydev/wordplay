// Import Database first, for the reason basisDocLocale.test.ts gives: it eagerly
// constructs the DB singleton, which must finish before anything pulls in the
// databases behind it.
import '@db/Database';
import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

/**
 * A basis carries names only for the locales its project declares. A program can
 * still *use* a language it doesn't declare — one `/es` tag is enough — and then
 * every creator-written name localizes while `Phrase` stays `Phrase`, which reads
 * as a half-translated program. `getLocalizedNames` is the way across.
 */

/**
 * en-US renamed, so the counterpart's names are unmistakably not the original's.
 *
 * Esperanto because `Basis.Bases` is a module-level cache keyed by locale name
 * and this suite runs unisolated: a synthetic locale claiming a shipped one's
 * name hands every later test a basis built from this file's fiction. That is
 * how this file first broke `basisDocLocale.test.ts`, which has its own
 * synthetic `fr`.
 */
const Esperanto: LocaleText = {
    ...DefaultLocale,
    language: 'eo',
    output: {
        ...DefaultLocale.output,
        Phrase: {
            ...DefaultLocale.output.Phrase,
            names: 'Frase',
        },
    },
};

function localesOf(...preferred: LocaleText[]) {
    return new Locales(concretize, preferred, DefaultLocale);
}

/** A project declaring the given locales, whose basis is therefore built from them. */
function projectIn(declared: LocaleText | LocaleText[]) {
    return Project.make(null, 'test', new Source('test', '1'), [], declared);
}

/** The Phrase structure in a basis, found by its en-US name. */
function phraseOf(project: Project) {
    return project
        .getDefaultShares()
        .all.find((def) => def.names.getNames().includes('Phrase'));
}

describe('Basis.getLocalizedNames', () => {
    test('a definition has no name in a language the project never declared', () => {
        const english = projectIn(DefaultLocale);
        const phrase = phraseOf(english);
        expect(phrase).toBeDefined();
        // This is the gap: asking the project's own basis yields nothing.
        expect(phrase?.names.getNameInLanguage('eo', false)).toBeUndefined();
    });

    test('the counterpart in that language supplies the name', () => {
        const english = projectIn(DefaultLocale);
        const phrase = phraseOf(english);
        expect(phrase).toBeDefined();
        if (phrase === undefined) return;

        const names = english.basis.getLocalizedNames(
            phrase,
            localesOf(Esperanto),
        );
        expect(names).toBeDefined();
        expect(names?.getNameInLanguage('eo', false)?.getName()).toBe('Frase');
    });

    /* Counterparts pair a definition's input binds too, which is what makes an
       input name localize alongside the type it belongs to. */
    test("a definition's inputs have counterparts as well", () => {
        const english = projectIn(DefaultLocale);
        const phrase = phraseOf(english);
        const input =
            phrase !== undefined && 'inputs' in phrase
                ? phrase.inputs[0]
                : undefined;
        expect(input).toBeDefined();
        if (input === undefined) return;

        expect(
            english.basis.getLocalizedNames(input, localesOf(Esperanto)),
        ).toBeDefined();
    });

    /* The common case stays free: no second basis is built when the locales the
       caller asks for are the ones this basis was built from. */
    test('asking for the basis’s own locales answers nothing', () => {
        const english = projectIn(DefaultLocale);
        const phrase = phraseOf(english);
        expect(phrase).toBeDefined();
        if (phrase === undefined) return;

        expect(
            english.basis.getLocalizedNames(phrase, localesOf(DefaultLocale)),
        ).toBeUndefined();
    });

    test('a project that declares the language needs no counterpart', () => {
        const declaring = projectIn([DefaultLocale, Esperanto]);
        const phrase = phraseOf(declaring);
        expect(phrase?.names.getNameInLanguage('eo', false)?.getName()).toBe(
            'Frase',
        );
    });
});
