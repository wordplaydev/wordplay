import { describe, expect, test } from 'vitest';
import {
    hasColorCombo,
    hasEmoji,
    segmentColorEmoji,
    segmentEmoji,
} from './emoji';

// Build sequences from escapes so the (invisible) selectors are explicit.
const keycap2 = '2\uFE0F\u20E3'; // 2 + FE0F + 20E3
const keycapHash = '#\uFE0F\u20E3'; // # + FE0F + 20E3
const keycapNoVS = '5\u20E3'; // 5 + 20E3 (no FE0F)
const copyright = '\u00A9\uFE0F'; // (c) + FE0F
const tm = '\u2122\uFE0F'; // TM + FE0F

describe('segmentColorEmoji', () => {
    test('wraps a lone keycap', () => {
        expect(segmentColorEmoji(keycap2)).toEqual([
            { text: keycap2, emoji: true },
        ]);
    });

    test('wraps a hash keycap', () => {
        expect(segmentColorEmoji(keycapHash)).toEqual([
            { text: keycapHash, emoji: true },
        ]);
    });

    test('wraps a keycap missing the FE0F selector', () => {
        // Both color fonts (Chromium COLRv1 and Safari OT-SVG) shape the
        // UNQUALIFIED digit + U+20E3, so the run is passed through verbatim \u2014
        // the keycap slice just needs the digit glyphs (see slice-emoji-svg.py).
        expect(segmentColorEmoji(keycapNoVS)).toEqual([
            { text: keycapNoVS, emoji: true },
        ]);
    });

    test('wraps legacy color symbols requesting color', () => {
        expect(segmentColorEmoji(copyright)).toEqual([
            { text: copyright, emoji: true },
        ]);
        expect(segmentColorEmoji(tm)).toEqual([{ text: tm, emoji: true }]);
    });

    test('leaves bare digits and symbols untouched', () => {
        expect(segmentColorEmoji('42')).toEqual([{ text: '42', emoji: false }]);
        expect(segmentColorEmoji('#')).toEqual([{ text: '#', emoji: false }]);
        // Legacy symbol without FE0F stays text.
        expect(segmentColorEmoji('©')).toEqual([{ text: '©', emoji: false }]);
    });

    test('splits mixed text into ordered runs', () => {
        expect(segmentColorEmoji(`go ${keycap2} now`)).toEqual([
            { text: 'go ', emoji: false },
            { text: keycap2, emoji: true },
            { text: ' now', emoji: false },
        ]);
    });

    test('handles adjacent keycaps', () => {
        expect(segmentColorEmoji(`${keycap2}${keycapHash}`)).toEqual([
            { text: keycap2, emoji: true },
            { text: keycapHash, emoji: true },
        ]);
    });

    test('returns a single plain run for non-matching text', () => {
        expect(segmentColorEmoji('hello')).toEqual([
            { text: 'hello', emoji: false },
        ]);
    });

    test('returns nothing for empty input', () => {
        expect(segmentColorEmoji('')).toEqual([]);
    });
});

describe('segmentEmoji', () => {
    const chat = '💬️'; // the editor appends FE0F via withColorEmoji
    const zwj = '👨‍💻'; // ZWJ sequence: must stay one grapheme
    const skin = '👍\u{1F3FD}'; // base + skin-tone modifier: one grapheme

    test('classifies an ordinary pictograph as emoji (color face)', () => {
        expect(segmentEmoji(chat)).toEqual([{ text: chat, kind: 'emoji' }]);
    });

    test('keeps a ZWJ sequence whole', () => {
        expect(segmentEmoji(zwj)).toEqual([{ text: zwj, kind: 'emoji' }]);
    });

    test('keeps a skin-tone sequence whole', () => {
        expect(segmentEmoji(skin)).toEqual([{ text: skin, kind: 'emoji' }]);
    });

    test('classifies keycaps and legacy combos as keycap (keycap face)', () => {
        expect(segmentEmoji(keycap2)).toEqual([
            { text: keycap2, kind: 'keycap' },
        ]);
        expect(segmentEmoji(copyright)).toEqual([
            { text: copyright, kind: 'keycap' },
        ]);
    });

    test('splits code text from emoji into ordered runs', () => {
        expect(segmentEmoji(`hand: ${chat}`)).toEqual([
            { text: 'hand: ', kind: 'text' },
            { text: chat, kind: 'emoji' },
        ]);
    });

    test('splits an ordinary emoji and an adjacent keycap into different kinds', () => {
        // The whole point of the split: a keycap must not share the ordinary
        // color run, since the two need different font stacks.
        expect(segmentEmoji(`${chat}${keycap2}`)).toEqual([
            { text: chat, kind: 'emoji' },
            { text: keycap2, kind: 'keycap' },
        ]);
    });

    test('coalesces adjacent ordinary emoji into one run', () => {
        expect(segmentEmoji(`${chat}${chat}`)).toEqual([
            { text: `${chat}${chat}`, kind: 'emoji' },
        ]);
    });

    test('leaves plain code as a single text run', () => {
        expect(segmentEmoji('hand')).toEqual([{ text: 'hand', kind: 'text' }]);
    });
});

describe('hasEmoji', () => {
    test('true for pictographs and keycap/legacy combos', () => {
        for (const t of ['🎭', '📚', '👍🏽', keycap2, keycapNoVS, copyright])
            expect(hasEmoji(t)).toBe(true);
        expect(hasEmoji('go 🎭 now')).toBe(true);
    });

    test('false for non-emoji content', () => {
        for (const t of ['', '?', '▦', '42', '#', '-', 'hello'])
            expect(hasEmoji(t)).toBe(false);
    });
});

describe('hasColorCombo', () => {
    test('matches what segmentColorEmoji wraps', () => {
        // True cases.
        for (const t of [keycap2, keycapHash, keycapNoVS, copyright, tm])
            expect(hasColorCombo(t)).toBe(true);
        expect(hasColorCombo(`go ${keycap2} now`)).toBe(true);
        // False cases: plain text, bare digits/symbols, and ordinary color
        // emoji whose FE0F belongs to a non-legacy base (must not false-positive
        // on the FE0F fast path).
        for (const t of ['', '42', '#', '©', 'hello', '❤️'])
            expect(hasColorCombo(t)).toBe(false);
    });
});
