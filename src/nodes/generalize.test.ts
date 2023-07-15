import { test, expect } from 'vitest';
import generalize from './generalize';
import { getDefaultNative } from '../native/Native';
import Project from '../models/Project';
import Source from './Source';
import { parseType, toTokens } from '../parser/Parser';

const native = await getDefaultNative();

test.each([
    ["'hi'|'hello'", "''"],
    ["'hi'/en|'hello'/en", "''/en"],
    ["'hi'/en|'hi'/fr", "'hi'/en|'hi'/fr"],
])('expect %s', (given: string, expected) => {
    const source = new Source('untitled', '');
    const project = new Project(null, 'untitled', source, [], native);
    const context = project.getContext(source);

    const type = parseType(toTokens(given));
    const generalized = generalize(type, context);

    expect(generalized.toWordplay()).toBe(expected);
});
