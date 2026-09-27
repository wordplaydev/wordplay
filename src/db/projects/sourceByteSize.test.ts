import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/**
 * The size a project is checked against is the size its write will be, so it has to be
 * real UTF-8. A JavaScript string counts UTF-16 code units — an emoji is two where it
 * costs four — and a source made of colors is nothing but those, so the estimate let a
 * project pass the edit check and then fail its write with nothing a creator could do.
 */
function bytesOf(code: string) {
    return Project.make(
        null,
        'test',
        new Source('main', code),
        [],
        DefaultLocale,
    ).getSourceByteSize();
}

test.each([
    ['plain ASCII', 'abc', 3],
    // Four bytes each, and two UTF-16 code units each.
    ['an emoji', '🌈🌈', 8],
    // Two bytes, one code unit.
    ['a degree sign', '°', 2],
])('%s is measured in bytes, not code units', (_, code, bytes) => {
    expect(bytesOf(code)).toBe(bytes);
});

test('a source of colors is undercounted by string length', () => {
    const colors = `[[🌈(12% 8 29°) 🌈(14% 9 31°)]]`;
    expect(bytesOf(colors)).toBeGreaterThan(colors.length);
});
