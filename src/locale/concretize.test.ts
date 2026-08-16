import Markup from '@nodes/Markup';
import ConceptLink from '@nodes/ConceptLink';
import { expect, test } from 'vitest';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import type LanguageCode from '@locale/LanguageCode';
import Locales, { type TemplateInput } from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';

test.each([
    ['', 'TBD', {}],
    ['Hello, my name is $name.', 'Hello, my name is Amy.', { name: 'Amy' }],
    [
        // An unresolvable input makes the whole template unparsable; the
        // failure message names the template by substituting it into
        // `unparsable`, rather than exposing that template's own placeholder.
        'To create a new $blah, click here.',
        DefaultLocale.ui.template.unparsable.replace(
            '$template',
            'To create a new $blah, click here.',
        ),
        {},
    ],
    [
        // Glossary terms are referenced with `@term` (resolved by ConceptLink to
        // the localized word), not `$term`.
        'To create a new @project, click here.',
        'To create a new project, click here.',
        {},
    ],
    [
        'I am $1 ??',
        DefaultLocale.ui.template.unparsable.replace('$template', 'I am $1 ??'),
        {},
    ],
    ['I received $a[$a|nothing]', 'I received nothing', { a: undefined }],
    ['I received $a[$a|nothing]', 'I received 1', { a: 1 }],
    [
        'I received $a[$b[$b|oops]|nothing]',
        'I received nothing',
        { a: undefined, b: 1 },
    ],
    // Brackets and bars without a mention are literal words, not branch delimiters.
    ['Hello [world]', 'Hello [world]', {}],
    ['I received $a[$a|nothing] | more', 'I received 1 | more', { a: 1 }],
    // A bare URL renders verbatim; its // is not folded as an escaped italic.
    ['see https://amyjko.com now', 'see https://amyjko.com now', {}],
])(
    '%s => %s',
    (
        template: string,
        result: string,
        inputs: Record<string, TemplateInput>,
    ) => {
        expect(DefaultLocales.concretize(template, inputs).toText()).toBe(
            result,
        );
    },
);

/** A Locales reading in the given language, for plural selection. */
function localesFor(language: LanguageCode): Locales {
    const locale = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    locale.language = language;
    return new Locales(concretize, [locale], DefaultLocale);
}

test('a count branch selects the form for its value', () => {
    const template = 'list of $#count[$count value|$count values]';
    expect(DefaultLocales.concretize(template, { count: 1 }).toText()).toBe(
        'list of 1 value',
    );
    for (const count of [0, 2, 11])
        expect(DefaultLocales.concretize(template, { count }).toText()).toBe(
            `list of ${count} values`,
        );
});

test('a count branch follows the reading locale, not English', () => {
    // Polish: one, few, many, other. 1 → one, 2 → few, 5 → many.
    const polish = localesFor('pl');
    const template = '$#count[jeden|kilka|wiele|inne]';
    expect(polish.concretize(template, { count: 1 }).toText()).toBe('jeden');
    expect(polish.concretize(template, { count: 2 }).toText()).toBe('kilka');
    expect(polish.concretize(template, { count: 5 }).toText()).toBe('wiele');

    // Arabic distinguishes six forms.
    const arabic = localesFor('ar');
    const six = '$#count[zero|one|two|few|many|other]';
    expect(arabic.concretize(six, { count: 0 }).toText()).toBe('zero');
    expect(arabic.concretize(six, { count: 2 }).toText()).toBe('two');
    expect(arabic.concretize(six, { count: 11 }).toText()).toBe('many');

    // Japanese distinguishes one, so a single arm serves every value.
    const japanese = localesFor('ja');
    for (const count of [0, 1, 2, 100])
        expect(japanese.concretize('$#count[個]', { count }).toText()).toBe(
            '個',
        );
});

test('a count branch with too few arms degrades to its last form', () => {
    // A half-translated string should still say something, not render the
    // unparsable-template message.
    const polish = localesFor('pl');
    expect(
        polish.concretize('$#count[jeden|inne]', { count: 5 }).toText(),
    ).toBe('inne');
});

test('an unmarked branch still tests presence, even for a number', () => {
    // The reason plurals are marked rather than inferred from the value: these
    // branches are presence tests on inputs that happen to be numbers.
    expect(
        DefaultLocales.concretize('$opacity[opacity $opacity|]', {
            opacity: 0,
        }).toText(),
    ).toBe('opacity 0');
    expect(
        DefaultLocales.concretize('$opacity[opacity $opacity|]', {
            opacity: undefined,
        }).toText(),
    ).toBe('');
});

test('a Markup input splices with links and spacing intact', () => {
    // Doc previews embed in templates (annotations: They say: "...");
    // flattening them rendered @Language as literal text.
    const doc = Markup.words(
        'I represent some text, with an optional @Language tag.',
    );
    const markup = DefaultLocales.concretize(
        'They say: \u201c$description\u201d',
        {
            description: doc,
        },
    );
    expect(markup.nodes().some((node) => node instanceof ConceptLink)).toBe(
        true,
    );
    const text = markup.toText();
    expect(text).toContain('They say:');
    expect(text).toContain('some text, with an optional');
});

test('an unwritten marker with content renders the content, not TBD', () => {
    // Locale files carry the en-US text after the $? marker, and Locales.get
    // annotates fallback strings the same way; that content must render.
    // Only a bare marker is truly unwritten.
    expect(
        DefaultLocales.concretize('$?number $number', { number: '5' }).toText(),
    ).toBe('number 5');
    expect(DefaultLocales.concretize('$?', {}).toText()).not.toBe('');
});

test('a $term word-list reference is expanded to its per-locale phrase', () => {
    const locale = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    locale.terms = { program: 'project' };
    const locales = new Locales(concretize, [locale], locale);
    // The term expands, and a real input still substitutes alongside it.
    expect(
        locales
            .concretize('Create a $program named $name', { name: 'Amy' })
            .toText(),
    ).toBe('Create a project named Amy');
});

test('a Unicode-key $term is expanded end-to-end', () => {
    const locale = JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
    locale.terms = { café: 'Kaffee' };
    const locales = new Locales(concretize, [locale], locale);
    expect(locales.concretize('Ein $café, bitte').toText()).toBe(
        'Ein Kaffee, bitte',
    );
});
