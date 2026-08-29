import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import LocalePath from '@util/verify-locales/LocalePath';
import { collectingLog } from '@util/verify-locales/Log';
import fs from 'fs';
import { expect, test } from 'vitest';
import checkTypedInputNames from './checkTypedInputNames';

/**
 * A type and the input that holds one should be one word, as they are in English. These read
 * the locale JSON only — no basis is built for the target locale — so a copy with one name
 * changed behaves the way the real file would.
 */

function locale(code: string): LocaleText {
    return JSON.parse(fs.readFileSync(getLocalePath(code), 'utf8'));
}

const PhraseBubble = new LocalePath(
    ['output', 'Phrase', 'bubble'],
    'names',
    [],
);
const Bubble = new LocalePath(['output', 'Bubble'], 'names', []);
function check(text: LocaleText, fix = false) {
    const { log, lines } = collectingLog();
    const revised = checkTypedInputNames(log, DefaultLocale, text, fix);
    return { lines, revised };
}

function withNames(
    base: LocaleText,
    changes: [LocalePath, string[]][],
): LocaleText {
    const copy: LocaleText = JSON.parse(JSON.stringify(base));
    for (const [path, names] of changes) path.repair(copy, names);
    return copy;
}

test('an input named differently from its type is reported', () => {
    // Constructed rather than read from a locale, so choosing a better word for a real
    // divergence doesn't quietly turn this into a test of nothing.
    const text = withNames(locale('el-GR'), [
        [Bubble, ['$~Φούσκα']],
        [PhraseBubble, ['$~φυσαλίδα']],
    ]);
    const { lines } = check(text);
    expect(
        lines.some(
            (line) =>
                line.includes('Phrase.bubble') &&
                line.includes('φυσαλίδα') &&
                line.includes('Φούσκα'),
        ),
    ).toBe(true);
});

test('the locales as they ship agree', () => {
    for (const code of ['el-GR', 'ja-JP', 'zh-TW', 'he-IL'])
        expect(
            check(locale(code)).lines.filter((line) => line.includes(' vs ')),
            code,
        ).toEqual([]);
});

test('the declared type does the work, not the word', () => {
    // `Phrase.face` is a typeface and `Face` is the camera stream; they share an English word
    // and nothing else, so they must never be compared.
    const greek = locale('el-GR');
    const { lines } = check(greek);
    expect(lines.some((line) => line.includes('Phrase.face'))).toBe(false);
    expect(lines.some((line) => line.includes('Track.key'))).toBe(false);
});

test('a type with no translation is a gap, not a disagreement', () => {
    const text = withNames(locale('el-GR'), [
        [Bubble, ['Bubble']],
        [PhraseBubble, ['$~φυσαλίδα']],
    ]);
    const { lines } = check(text);
    expect(lines.some((line) => line.includes('Phrase.bubble'))).toBe(false);
});

test('an input still spelled in English takes its type’s word', () => {
    const text = withNames(locale('el-GR'), [
        [Bubble, ['$~Φούσκα']],
        [PhraseBubble, ['$?bubble']],
    ]);
    const { revised } = check(text, true);
    // Lower-cased initial, the way en-US names `Bubble`'s input `bubble`.
    expect(PhraseBubble.resolve(revised)).toEqual(['$~φούσκα']);
});

test('agreement up to case is agreement', () => {
    const text = withNames(locale('el-GR'), [
        [Bubble, ['$~Φούσκα']],
        [PhraseBubble, ['$~φούσκα']],
    ]);
    expect(
        check(text).lines.some((line) => line.includes('Phrase.bubble')),
    ).toBe(false);
});

test('word choice is never repaired', () => {
    // The type is sometimes the mistranslation, so unifying onto it is a person's call.
    const text = withNames(locale('el-GR'), [
        [Bubble, ['$~Φούσκα']],
        [PhraseBubble, ['$~φυσαλίδα']],
    ]);
    const { revised, lines } = check(text, true);
    expect(PhraseBubble.resolve(revised)).toEqual(['$~φυσαλίδα']);
    expect(lines.some((line) => line.includes('Phrase.bubble'))).toBe(true);
});

test('en-US agrees with itself', () => {
    const { lines } = check(DefaultLocale);
    expect(lines.filter((line) => line.includes(' vs '))).toEqual([]);
});
