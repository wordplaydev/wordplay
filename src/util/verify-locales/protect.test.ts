import { expect, test } from 'vitest';
import {
    hasOutOfExampleBreak,
    hasUnclosedText,
    leadingAnnotations,
    splitDocParagraphs,
} from './protect';

test('hasUnclosedText flags an identifier that picked up a string delimiter', () => {
    // An apostrophe written as ASCII `'` opens a text literal that never closes.
    expect(hasUnclosedText("o'brien: 5")).toBe(true);
    expect(hasUnclosedText('a: "unclosed')).toBe(true);
});

test('hasUnclosedText accepts balanced literals and interpolations', () => {
    expect(hasUnclosedText('oʼbrien: 5')).toBe(false); // U+02BC is a letter, not a delimiter
    expect(hasUnclosedText('say("hi")')).toBe(false);
    expect(hasUnclosedText('joe,tess,amy: 5')).toBe(false);
    // A `\…\` inside a text literal is an embedded expression, not a close.
    expect(hasUnclosedText('"sums \\1 + 2\\ and \\2 + 3\\"')).toBe(false);
    expect(hasUnclosedText('“”')).toBe(false); // empty literal, matched pair
});

test('splitDocParagraphs splits at blank lines between paragraphs', () => {
    expect(splitDocParagraphs('one\n\ntwo\n\n\nthree')).toEqual([
        'one',
        'two',
        'three',
    ]);
    // Leading/trailing breaks and whitespace produce no empty paragraphs.
    expect(splitDocParagraphs('  \n\none\n\n')).toEqual(['one']);
    // A single newline is a soft break within a paragraph, not a split point.
    expect(splitDocParagraphs('one\ntwo')).toEqual(['one\ntwo']);
});

test('splitDocParagraphs never splits inside example code', () => {
    // The real en-US node.Paragraph.doc[4]: a doc literal with blank lines inside `\…\`.
    const example =
        "\\¶Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.¶'three paragraphs'\\";
    expect(splitDocParagraphs(example)).toEqual([example]);
    expect(splitDocParagraphs(`intro:\n\n${example}\n\noutro`)).toEqual([
        'intro:',
        example,
        'outro',
    ]);
    // Embedded expressions inside a text literal don't end the example.
    const nested = '\\"sums \\1 + 2\\, \\2 + 3\\"\\';
    expect(splitDocParagraphs(`a\n\n${nested} b`)).toEqual(['a', `${nested} b`]);
});

test('splitDocParagraphs treats an unclosed trailing example as code', () => {
    // Corrupted input with an unbalanced `\` degrades to a protected code tail.
    expect(splitDocParagraphs('a\n\n\\code\n\nmore')).toEqual([
        'a',
        '\\code\n\nmore',
    ]);
});

test('hasOutOfExampleBreak only flags breaks outside examples', () => {
    expect(hasOutOfExampleBreak('one\n\ntwo')).toBe(true);
    expect(hasOutOfExampleBreak('\\¶P1.\n\nP2.¶\\')).toBe(false);
    expect(hasOutOfExampleBreak('single paragraph\nwith a soft break')).toBe(
        false,
    );
});

test('leadingAnnotations extracts the marker prefix', () => {
    expect(leadingAnnotations('$~foo')).toBe('$~');
    expect(leadingAnnotations('$?$~foo')).toBe('$?$~');
    expect(leadingAnnotations('plain')).toBe('');
    // A mid-string $name mention is not an annotation.
    expect(leadingAnnotations('the $value is')).toBe('');
});
