import { describe, expect, test } from 'vitest';
import {
    citations,
    codeSpans,
    countSentences,
    isCandidate,
    linkTargets,
    reduction,
    rejectRewrite,
    scanCandidates,
} from './condenseRules';

describe('countSentences', () => {
    test('counts ordinary sentences', () => {
        expect(countSentences('We fixed a bug.')).toBe(1);
        expect(countSentences('We fixed a bug. It was bad.')).toBe(2);
        expect(countSentences('Did we fix it? We did! Twice.')).toBe(3);
    });

    test('a period inside a code span is not a sentence break', () => {
        // `1.5m` and `0.35.0` are the reason this masking exists: without it,
        // an entry about units or versions counts as several sentences and gets
        // sent for condensation that has nothing to do.
        expect(countSentences('You can now write `1.5m` for a distance.')).toBe(
            1,
        );
        expect(countSentences('We released `0.35.0` today.')).toBe(1);
    });

    test('a trailing citation is not a sentence', () => {
        expect(countSentences('We fixed a bug. (#398)')).toBe(1);
        expect(countSentences('We fixed a bug. (#398, #400)')).toBe(1);
    });

    test('e.g. and i.e. are not sentence breaks', () => {
        expect(countSentences('Use a symbol, e.g. the arrow, to move.')).toBe(
            1,
        );
        expect(countSentences('It is inclusive, i.e. both ends count.')).toBe(
            1,
        );
    });

    test('a link target with dots is not a sentence break', () => {
        expect(
            countSentences(
                'Read the [About](https://wordplay.dev/about) page.',
            ),
        ).toBe(1);
    });

    test('text with no terminal punctuation is still one sentence', () => {
        expect(countSentences('We fixed a bug')).toBe(1);
    });

    test('isCandidate selects only entries with something to lose', () => {
        expect(isCandidate('We fixed a bug.')).toBe(false);
        expect(isCandidate('We fixed a bug. It was bad.')).toBe(true);
    });
});

describe('extraction', () => {
    test('pulls code spans, link targets, and citations', () => {
        const text =
            'Write `1‥10` and read the [Guide](https://wordplay.dev/guide). (#398)';
        expect(codeSpans(text)).toEqual(['1‥10']);
        expect(linkTargets(text)).toEqual(['https://wordplay.dev/guide']);
        expect(citations(text)).toEqual(['398']);
    });
});

describe('rejectRewrite', () => {
    const before =
        'You can now write a range like `1‥10`. It holds every number from one end to the other. (#398)';

    test('accepts a shorter one-sentence rewrite that keeps everything', () => {
        expect(
            rejectRewrite(
                before,
                'You can now write a range like `1‥10`, holding every number between its ends. (#398)',
                null,
            ),
        ).toBeUndefined();
    });

    test('refuses a rewrite that dropped the code span', () => {
        // The code is the concrete thing the entry is about; a condensation
        // that cuts it has cut the wrong clause.
        expect(
            rejectRewrite(
                before,
                'You can now write a range of numbers. (#398)',
                null,
            ),
        ).toBe('code');
    });

    test('refuses a rewrite that dropped or changed a link', () => {
        const linked =
            'Read the [About](https://wordplay.dev/about) page. It is new.';
        expect(rejectRewrite(linked, 'Read the About page.', null)).toBe(
            'link',
        );
        expect(
            rejectRewrite(
                linked,
                'Read the [About](https://wordplay.dev/acerca) page.',
                null,
            ),
        ).toBe('link');
    });

    test('refuses a rewrite that dropped the citation', () => {
        expect(
            rejectRewrite(
                before,
                'You can now write a range like `1‥10`.',
                null,
            ),
        ).toBe('citation');
    });

    test('refuses a rewrite that is not shorter', () => {
        expect(rejectRewrite(before, before, null)).toBe('longer');
    });

    test('refuses an empty rewrite', () => {
        expect(rejectRewrite(before, '   ', null)).toBe('empty');
    });

    test('refuses a second sentence with no declared reason', () => {
        const two =
            'You can now write a range like `1‥10`. It counts both ends. (#398)';
        expect(rejectRewrite(before, two, null)).toBe('sentences');
        // Declared, so allowed — this is the whole point of making the model
        // name its exception rather than inferring one from the text.
        expect(rejectRewrite(before, two, 'code')).toBeUndefined();
        expect(rejectRewrite(before, two, 'caveat')).toBeUndefined();
    });

    test('refuses three sentences however they are justified', () => {
        expect(
            rejectRewrite(
                before,
                'A range. Like `1‥10`. Both ends count. (#398)',
                'caveat',
            ),
        ).toBe('sentences');
    });

    test('refuses a rewrite whose markup stops early', () => {
        // An odd backtick becomes an unbalanced Example, which truncates
        // everything after it when the page renders — the defect the last hand
        // pass over this file introduced.
        expect(
            rejectRewrite(
                'We fixed the `translate` call on a list. It was wrong.',
                'We fixed the `translate call on a list.',
                null,
            ),
        ).toBe('code');
    });
});

test('reduction reports how much was cut', () => {
    expect(reduction('a'.repeat(100), 'a'.repeat(40))).toBeCloseTo(0.6);
});

describe('scanCandidates', () => {
    const file = [
        '# Change Log',
        '',
        '## 0.35.0 - 2026-09-05',
        '',
        '### Added',
        '',
        '- 🔑 One sentence only.',
        '- 🏫 Two sentences here. This is the second.',
        '',
        '## 0.16.38',
        '',
        '### Fixed',
        '',
        '- A dateless release. Its entries never render.',
    ];

    test('takes only multi-sentence entries in dated releases', () => {
        const found = scanCandidates(file);
        expect(found).toHaveLength(1);
        expect(found[0].version).toBe('0.35.0');
        expect(found[0].emoji).toBe('🏫');
        expect(found[0].body).toBe('Two sentences here. This is the second.');
    });

    test('records the line and the whole original, for the splice guard', () => {
        const [found] = scanCandidates(file);
        expect(found.line).toBe(7);
        expect(file[found.line]).toBe(found.original);
    });

    test('a dateless heading ends the release rather than continuing it', () => {
        // The page filters dateless releases out, so translating their entries
        // would buy prose no reader can reach.
        expect(
            scanCandidates(file).some((c) => c.body.includes('dateless')),
        ).toBe(false);
    });
});
