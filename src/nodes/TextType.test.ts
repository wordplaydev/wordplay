import { readFileSync } from 'fs';
import { expect, test } from 'vitest';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import Project from '@db/projects/Project';
import concretize from '@locale/concretize';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import Locales from '@locale/Locales';
import parseType from '@parser/parseType';
import { toTokens } from '@parser/toTokens';
import Source from '@nodes/Source';
import UnionType from '@nodes/UnionType';

function setup() {
    const source = new Source('untitled', '');
    const project = Project.make(null, 'untitled', source, [], DefaultLocale);
    return project.getContext(source);
}

test.each([
    // Literal text-vs-literal text: text match alone is enough; locale doesn't have to match.
    [`"zippy"/en`, `"zippy"`, true],
    [`"zippy"/en`, `"zippy"/es`, true],
    [`"zippy"`, `"zippy"/en`, true],
    // Literal text-vs-literal text with different text: reject regardless of locale.
    [`"zippy"/en`, `"hello"/en`, false],
    [`"zippy"`, `"hello"`, false],
    // Generic-text param with a language tag: language must match (literal exception doesn't apply).
    [`''/en`, `"x"`, false],
    [`''/en`, `"x"/en`, true],
    [`''/en`, `"x"/es`, false],
    // Generic-text param without a language tag: accepts anything text.
    [`''`, `"x"`, true],
    [`''`, `"x"/es`, true],
])('%s accepts %s -> %s', (param, given, expected) => {
    const context = setup();
    const paramType = parseType(toTokens(param));
    const givenType = parseType(toTokens(given));
    expect(paramType.accepts(givenType, context)).toBe(expected);
});

const en = DefaultLocale;
const es: LocaleText = JSON.parse(
    readFileSync('static/locales/es-MX/es-MX.json', 'utf8'),
);
const zh: LocaleText = JSON.parse(
    readFileSync('static/locales/zh-CN/zh-CN.json', 'utf8'),
);

// Repro of github.com/wordplaydev/wordplay/issues/541: when a project's locales
// have accumulated en + es + zh, the IncompatibleInput explanation for the
// Sequence `style` parameter should list only the current locale's easing
// names, not every locale's names concatenated together.
test.each([
    [
        [en],
        ['straight', 'cautious', 'pokey', 'zippy'],
        ['recto', 'cauteloso', 'lento', 'rápido', '直线', '谨慎', '慢吞吞', '迅速'],
    ],
    [
        [es],
        ['recto', 'cauteloso', 'lento', 'rápido'],
        ['straight', 'cautious', 'pokey', 'zippy', '直线', '谨慎', '慢吞吞', '迅速'],
    ],
    [
        [zh],
        ['直线', '谨慎', '慢吞吞', '迅速'],
        ['straight', 'cautious', 'pokey', 'zippy', 'recto', 'cauteloso', 'lento', 'rápido'],
    ],
])(
    'Sequence style conflict with current locale %s lists only that locale',
    (current, included, excluded) => {
        const source = new Source(
            'untitled',
            'Sequence({0%:Pose()} 5s "bogus")',
        );
        const project = Project.make(null, 'untitled', source, [], [en, es, zh]);
        const context = project.getContext(source);
        const locales = new Locales(concretize, current, DefaultLocale);

        project.analyze();
        const conflict = project
            .getConflicts()
            .find((c) => c instanceof IncompatibleInput);
        expect(conflict).toBeDefined();
        if (conflict === undefined) return;
        const explanation = conflict.expectedType
            .simplify(context)
            .getDescription(locales, context)
            .toText();
        for (const name of included) expect(explanation).toContain(name);
        for (const name of excluded) expect(explanation).not.toContain(name);
    },
);

// The localized union rendering in en-US uses Oxford-comma "one of A, B, ..., or Z"
// and the TextType description in en-US renders literals as 'X'.
test.each([
    [`"a"|"b"`, `One of 'a' or 'b'`],
    [`"a"|"b"|"c"`, `One of 'a', 'b', or 'c'`],
    [`"a"|"b"|"c"|"d"`, `One of 'a', 'b', 'c', or 'd'`],
])('UnionType.getDescription %s -> %s', (input: string, expected: string) => {
    const source = new Source('untitled', '');
    const project = Project.make(null, 'untitled', source, [], DefaultLocale);
    const context = project.getContext(source);
    const locales = new Locales(concretize, [DefaultLocale], DefaultLocale);
    const type = parseType(toTokens(input));
    expect(type).toBeInstanceOf(UnionType);
    expect(type.getDescription(locales, context).toText()).toBe(expected);
});
