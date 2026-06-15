import { describe, expect, test } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import evaluateCode from '@runtime/evaluate';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import FormattedType from '@nodes/FormattedType';
import Localized from '@nodes/Localized';
import NumberType from '@nodes/NumberType';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';

test.each([
    // Tagging a computed (parenthesized) text overrides/sets its locale.
    ['("a" + "b")/en', '"ab"/en'],
    // A literal consumes its own trailing tag, and combine unions it.
    ['"a" + "b"/en', '"ab"/en'],
    // Override replaces an existing tag (literal /es, then operator /en).
    ['"a"/es/en', '"a"/en'],
    // A parenthesized reference holding text can be tagged.
    ['greeting: "hello"\n(greeting)/en', '"hello"/en'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toWordplay()).toBe(expected);
});

test('non-text values pass through unchanged', () => {
    // `1/en` parses as a number with a unit, so wrap in parens to force the
    // Localized operator; the number is returned unchanged.
    expect(evaluateCode('(1)/en')?.toString()).toBe('1');
});

test('binds to the atomic expression, not the whole binary expression', () => {
    // In `"a" + "b"/en` the tag binds to the right operand (consumed by the
    // literal), so the expression is still a sum and nothing wraps the whole.
    const nodes = parseProgram(toTokens('"a" + "b"/en')).nodes();
    expect(nodes.some((n) => n instanceof BinaryEvaluate)).toBe(true);
    expect(nodes.some((n) => n instanceof Localized)).toBe(false);
});

test('parenthesized expression tags the whole expression with Localized', () => {
    const program = parseProgram(toTokens('("a" + "b")/en'));
    const localized = program.nodes().find((n) => n instanceof Localized) as
        | Localized
        | undefined;
    expect(localized).toBeDefined();
});

describe('Localized.getPossibleReplacements', () => {
    const source = new Source('test', '"hi"');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const base = { context, locales: DefaultLocales };

    test.each([
        ['text', TextType.make()],
        ['formatted', FormattedType.make()],
    ])('wraps a selected %s expression in a locale tag', (_label, type) => {
        const node = TextLiteral.make('hi');
        const replacements = Localized.getPossibleReplacements({
            ...base,
            type,
            node,
        });
        expect(replacements).toHaveLength(1);
        const wrap = replacements[0];
        expect(wrap).toBeInstanceOf(Localized);
        if (wrap instanceof Localized) expect(wrap.expression).toBe(node);
    });

    test('suggests nothing when a non-text type is expected', () => {
        const node = TextLiteral.make('hi');
        expect(
            Localized.getPossibleReplacements({
                ...base,
                type: NumberType.make(),
                node,
            }),
        ).toHaveLength(0);
    });

    test.each([
        ['text', TextType.make()],
        ['formatted', FormattedType.make()],
    ])('offers an insertion for a %s slot', (_label, type) => {
        const inserts = Localized.getPossibleInsertions({
            ...base,
            type,
            parent: source.expression,
            field: 'statements',
            index: 0,
        });
        expect(inserts).toHaveLength(1);
        expect(inserts[0]).toBeInstanceOf(Localized);
    });
});
