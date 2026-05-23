import concretize from '@locale/concretize';
import { readFileSync } from 'fs';
import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import parseType from '@parser/parseType';
import { toTokens } from '@parser/toTokens';
import Source from '@nodes/Source';
import UnionType from '@nodes/UnionType';

test.each([
    ["'hi'|'hello'", "''"],
    ["'hi'/en|'hello'/en", "''/en"],
    ["'hi'/en|'hi'/fr", "''/en|''/fr"],
    ['1|2|3', '#'],
    ['1m|2|3', '#'],
    ['1m|2m|3m', '#m'],
    ['[1|2|3]', '[#]'],
    ['{1}', '{#}'],
    ['{1|2:2|3}', '{#:#}'],
])('expect %s', (given: string, expected) => {
    const source = new Source('untitled', '');
    const project = Project.make(null, 'untitled', source, [], DefaultLocale);
    const context = project.getContext(source);

    const type = parseType(toTokens(given));
    const generalized = type.generalize(context);

    expect(generalized.toWordplay()).toBe(expected);
});

const en = DefaultLocale;
const es: LocaleText = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
);

test.each([
    // Current locale es: keep only Spanish-tagged arms.
    [`"a"/en|"b"/en|"x"/es|"y"/es`, [es], ['"x"/es', '"y"/es']],
    // Current locale en: keep only English-tagged arms.
    [`"a"/en|"b"/en|"x"/es|"y"/es`, [en], ['"a"/en', '"b"/en']],
    // No arms match current locale (zh, but we only have en/es): fall back to full list.
    [`"a"/en|"b"/en`, [es], ['"a"/en', '"b"/en']],
    // Untagged arms are always kept.
    [`"a"|"b"/es|"c"/en`, [en], ['"a"', '"c"/en']],
])(
    '%s with locales %s -> %s',
    (given: string, localeTexts: LocaleText[], expected: string[]) => {
        const source = new Source('untitled', '');
        const project = Project.make(
            null,
            'untitled',
            source,
            [],
            DefaultLocale,
        );
        const context = project.getContext(source);
        const locales = new Locales(concretize, localeTexts, DefaultLocale);

        const type = parseType(toTokens(given));
        if (!(type instanceof UnionType))
            throw new Error(`Expected UnionType, got ${type.toWordplay()}`);
        const filtered = type.getLocalizedTypes(locales, context);
        expect(filtered.map((t) => t.toWordplay())).toEqual(expected);
    },
);
