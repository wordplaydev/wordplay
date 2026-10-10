import { expect, test } from 'vitest';
import Markup from '#nodes/Markup.ts';
import Pose from '#output/animation/Pose.ts';
import NoneValue from '#values/NoneValue.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import {
    groupWords,
    poseGlyphs,
    toGlyphRuns,
    toGlyphs,
    toGlyphTransform,
} from '#output/Output/glyphPoses.ts';

const none = new NoneValue(NumberLiteral.make(1));
function pose(rotation: number) {
    return new Pose(none, undefined, undefined, undefined, rotation);
}

test('a glyph is a grapheme, so emoji and combining marks are one glyph each', () => {
    const family = '\u{1F469}\u200D\u{1F469}\u200D\u{1F467}';
    const accented = 'e\u0301';
    expect(toGlyphs(`a${family}${accented}`).length).toBe(3);
});

test('a custom character is one glyph', () => {
    expect(toGlyphs('a@amy/cat b').map((g) => g.kind)).toEqual([
        'text',
        'character',
        'text',
        'text',
    ]);
});

test('poses cycle across glyphs, wrapping around, from the given start', () => {
    const poses = [pose(1), pose(2), pose(3)];
    expect(poseGlyphs('abcde', poses).map((g) => g.pose.rotation)).toEqual([
        1, 2, 3, 1, 2,
    ]);
    expect(poseGlyphs('ab', poses, 2).map((g) => g.pose.rotation)).toEqual([
        3, 1,
    ]);
});

test('words are grouped apart from the spaces between them', () => {
    const groups = groupWords(poseGlyphs('ab cd', [pose(0)]));
    expect(
        groups.map((group) =>
            group
                .map((g) => (g.glyph.kind === 'text' ? g.glyph.text : ''))
                .join(''),
        ),
    ).toEqual(['ab', ' ', 'cd']);
});

test('a glyph pose that moves nothing has no transform', () => {
    expect(toGlyphTransform(new Pose(none))).toBeUndefined();
    expect(toGlyphTransform(pose(0))).toBeUndefined();
    expect(toGlyphTransform(pose(15))).toBe(
        'translate(0px, 0px) rotate(15deg) scale(1, 1)',
    );
});

test("markup's glyph runs keep its styles and the spaces between them", () => {
    const runs = toGlyphRuns(Markup.words('*ransom* _note_ here'));
    expect(runs.map((run) => run.text).join('')).toBe('ransom note here');
    expect(runs.find((run) => run.text === 'ransom')?.weight).toBe(700);
    expect(runs.find((run) => run.text === 'note')?.underline).toBe(true);
});
