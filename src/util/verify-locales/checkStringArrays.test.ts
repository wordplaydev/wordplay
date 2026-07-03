import { Unwritten } from '@locale/Annotations';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import LocalePath from '@util/verify-locales/LocalePath';
import Log from '@util/verify-locales/Log';
import { expect, test } from 'vitest';
import checkStringArrays from './checkStringArrays';

function copyLocale(): LocaleText {
    return JSON.parse(JSON.stringify(DefaultLocale)) as LocaleText;
}

const LabelsPath = new LocalePath(
    ['ui', 'howto', 'editor', 'notification'],
    'labels',
    [],
);

const AltKeysPath = new LocalePath(['input', 'Key', 'keys'], 'Alt', []);

test('markup arrays may differ in length from en-US', () => {
    const target = copyLocale();
    target.node.Paragraph.doc = ['one', 'two'];
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(fixed.node.Paragraph.doc).toEqual(['one', 'two']);
});

test('markup elements with out-of-example breaks are split on fix', () => {
    const target = copyLocale();
    const example = "\\¶P1.\n\nP2.¶'ok'\\";
    target.node.Paragraph.doc = ['$~uno\n\ndos', `$~${example}`];
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(fixed.node.Paragraph.doc).toEqual(['$~uno', 'dos', example]);
});

test('markup annotations are moved to the first element only on fix', () => {
    const target = copyLocale();
    target.node.Paragraph.doc = ['uno', '$~dos', 'tres'];
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(fixed.node.Paragraph.doc).toEqual(['$~uno', 'dos', 'tres']);
});

test('mixed markup statuses collapse to the highest priority', () => {
    const target = copyLocale();
    target.node.Paragraph.doc = ['$~uno', '$?dos'];
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(fixed.node.Paragraph.doc).toEqual(['$?uno', 'dos']);
});

test('a canonical markup array is left alone', () => {
    const target = copyLocale();
    target.node.Paragraph.doc = ['$~uno', 'dos'];
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(fixed.node.Paragraph.doc).toEqual(['$~uno', 'dos']);
    const bare = copyLocale();
    bare.node.Paragraph.doc = [Unwritten];
    const fixedBare = checkStringArrays(new Log(false), DefaultLocale, bare, true);
    expect(fixedBare.node.Paragraph.doc).toEqual([Unwritten]);
});

test('verify mode reports but never mutates', () => {
    const target = copyLocale();
    target.node.Paragraph.doc = ['a\n\nb'];
    const result = checkStringArrays(
        new Log(false),
        DefaultLocale,
        target,
        false,
    );
    expect(result).toBe(target);
    expect(target.node.Paragraph.doc).toEqual(['a\n\nb']);
});

test('positional arrays are padded or truncated to the en-US length on fix', () => {
    const short = copyLocale();
    LabelsPath.repair(short, ['x']);
    const padded = checkStringArrays(new Log(false), DefaultLocale, short, true);
    expect(LabelsPath.resolve(padded)).toEqual(['x', Unwritten]);

    const long = copyLocale();
    LabelsPath.repair(long, ['x', 'y', 'z']);
    const truncated = checkStringArrays(
        new Log(false),
        DefaultLocale,
        long,
        true,
    );
    expect(LabelsPath.resolve(truncated)).toEqual(['x', 'y']);
});

test('name arrays may differ in length from en-US', () => {
    const target = copyLocale();
    target.basis.Number.function.add.names = ['plus'];
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(fixed.basis.Number.function.add.names).toEqual(['plus']);
});

test('Key.keys synonym lists may differ in length from en-US', () => {
    const target = copyLocale();
    AltKeysPath.repair(target, ['Alt', 'Option', 'Alternative']);
    const fixed = checkStringArrays(new Log(false), DefaultLocale, target, true);
    expect(AltKeysPath.resolve(fixed)).toEqual(['Alt', 'Option', 'Alternative']);
});
