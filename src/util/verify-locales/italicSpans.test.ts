import { describe, expect, test } from 'vitest';
import DefaultLocale from '#locale/DefaultLocale.ts';
import type LocaleText from '#locale/LocaleText.ts';
import checkItalicSpans, { swapItalic } from './checkItalicSpans';
import {
    getItalicLabels,
    getItalicLabelsForPrompt,
    getItalicSpans,
} from './italicSpans';
import { collectingLog } from './Log';

describe('getItalicSpans', () => {
    test('finds italic spans in order', () => {
        expect(
            getItalicSpans('Open the /shortcuts/ list, then /share/.'),
        ).toEqual(['shortcuts', 'share']);
    });

    test('ignores italics inside an example', () => {
        expect(getItalicSpans('Try \\¶an /inner/ doc¶ 1\\ here.')).toEqual([]);
    });
});

/** en-US with two strings replaced, and a locale translating them. */
function pairOf(
    english: [string, string],
    translated: [string, string],
): [LocaleText, LocaleText] {
    const source = structuredClone(DefaultLocale);
    source.ui.source.tour.shortcuts = english[0];
    source.node.Paragraph.doc = [english[1]];
    const target = structuredClone(source);
    // Latin script, so only a name the locale has on record is reported and
    // the untouched English everywhere else in this clone stays quiet.
    target.language = 'fr';
    target.ui.source.tour.shortcuts = translated[0];
    target.node.Paragraph.doc = [translated[1]];
    return [source, target];
}

describe('getItalicLabels', () => {
    test('learns the locale word for an italic span from an aligned string', () => {
        const [source, target] = pairOf(
            ['The /shortcuts/ button.', 'See the /shortcuts/ list.'],
            ['$~/ショートカット/ ボタン。', '$~/shortcuts/ の一覧。'],
        );
        expect(getItalicLabels(source, target).get('shortcuts')).toBe(
            'ショートカット',
        );
    });

    test('never records a key combination', () => {
        const [source, target] = pairOf(
            ['Press /ctrl+9/.', 'Nothing.'],
            ['$~/コントロール+9/ を押す。', '$~なし。'],
        );
        expect(getItalicLabels(source, target).has('ctrl+9')).toBe(false);
    });

    test('renders the record in a stable order', () => {
        expect(
            getItalicLabelsForPrompt(
                new Map([
                    ['share', '共有'],
                    ['palette', 'パレット'],
                ]),
            ),
        ).toBe('- "palette" -> "パレット"\n- "share" -> "共有"');
    });
});

describe('checkItalicSpans', () => {
    test('swaps in the word a locale already uses for a name, keeping the rest', () => {
        const [source, target] = pairOf(
            ['The /shortcuts/ button.', 'See the /shortcuts/ list.'],
            ['$~/ショートカット/ ボタン。', '$~/shortcuts/ の一覧。'],
        );
        const revised = checkItalicSpans(
            collectingLog().log,
            source,
            target,
            true,
        );
        expect(revised.node.Paragraph.doc).toEqual([
            '$~/ショートカット/ の一覧。',
        ]);
    });

    test('only reports a human-written string', () => {
        const [source, target] = pairOf(
            ['The /shortcuts/ button.', 'See the /shortcuts/ list.'],
            ['$~/ショートカット/ ボタン。', '/shortcuts/ の一覧。'],
        );
        const { log, lines } = collectingLog();
        const revised = checkItalicSpans(log, source, target, true);
        expect(revised.node.Paragraph.doc).toEqual(['/shortcuts/ の一覧。']);
        expect(lines.join('\n')).toContain('node.Paragraph.doc');
    });

    test('only reports a name nothing records, so it never starts paid work', () => {
        const source = structuredClone(DefaultLocale);
        source.ui.source.tour.shortcuts = 'Use the /toggle/ here.';
        const target = structuredClone(source);
        target.language = 'ja';
        target.ui.source.tour.shortcuts = '$~ここで /toggle/ を使う。';
        const revised = checkItalicSpans(
            collectingLog().log,
            source,
            target,
            true,
        );
        expect(revised.ui.source.tour.shortcuts).toBe(
            '$~ここで /toggle/ を使う。',
        );
    });
});

test('swapItalic replaces the italic name but never inside an example', () => {
    expect(
        swapItalic(
            'La liste /shortcuts/ et \\"/shortcuts/"\\.',
            'shortcuts',
            'raccourcis',
        ),
    ).toBe('La liste /raccourcis/ et \\"/shortcuts/"\\.');
});
