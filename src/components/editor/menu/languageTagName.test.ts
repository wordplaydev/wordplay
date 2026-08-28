import { getLanguageTagName } from '@components/editor/menu/languageTagName';
import Language from '@nodes/Language';
import NumberLiteral from '@nodes/NumberLiteral';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';
import { expect, test } from 'vitest';

function tag(source: string): Language {
    const language = parseProgram(toTokens(`a/${source}: 5`))
        .nodes()
        .find((n) => n instanceof Language);
    if (language === undefined)
        throw new Error(`No tag parsed from /${source}`);
    return language;
}

test.each([
    ['es', 'español'],
    ['es-MX', 'español (México)'],
    ['Español-México', 'español (México)'],
    ['es_en', 'español + English'],
    ['en-US_CA', 'English (United States/Canada)'],
])('/%s reads as "%s"', (source, name) => {
    expect(getLanguageTagName(tag(source))).toBe(name);
});

test('a tag naming nothing keeps the node doc rather than an empty note', () => {
    expect(getLanguageTagName(tag('aaa'))).toBeUndefined();
});

test('anything that is not a tag has no name', () => {
    expect(getLanguageTagName(NumberLiteral.make(1))).toBeUndefined();
});
