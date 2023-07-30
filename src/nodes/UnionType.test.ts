import { test, expect } from 'vitest';
import Project from '../models/Project';
import Source from './Source';
import { parseType, toTokens } from '../parser/Parser';
import { DefaultLocale } from '../db/Creator';

test.each([
    ["'hi'|'hello'", "''"],
    ["'hi'/en|'hello'/en", "''/en"],
    ["'hi'/en|'hi'/fr", "''/en|''/fr"],
    ['1|2|3', '#'],
    ['1m|2|3', '#m|#'],
    ['1m|2m|3m', '#m'],
    ['[1|2|3]', '[#]'],
    ['{1}', '{#}'],
    ['{1|2:2|3}', '{#:#}'],
])('expect %s', (given: string, expected) => {
    const source = new Source('untitled', '');
    const project = new Project(null, 'untitled', source, [], DefaultLocale);
    const context = project.getContext(source);

    const type = parseType(toTokens(given));
    const generalized = type.generalize(context);

    expect(generalized.toWordplay()).toBe(expected);
});
