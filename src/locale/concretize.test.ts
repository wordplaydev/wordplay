import { expect, test } from 'vitest';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
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
