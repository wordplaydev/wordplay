import Caret from '@edit/caret/Caret';
import describeMarkupChange from '@edit/markup/describeChange';
import {
    toggleBullet,
    toggleDefect,
    toggleFormat,
    toggleHighlight,
} from '@edit/markup/formatOperations';
import { markupToSource } from '@edit/markup/markupSource';
import DefaultLocales from '@locale/DefaultLocales';
import type { Format } from '@nodes/Words';
import { describe, expect, test } from 'vitest';

/**
 * The rule these guard is CLAUDE.md's: an announcement that can fire more than
 * once must say something different each time, or it is heard once and then the
 * app sounds broken. A toggle is the sharpest case — "formatted" would be the
 * same words going on and going off.
 */

function caretIn(markup: string, position: number): Caret {
    // +1 for the `¶` wrapper.
    return new Caret(
        markupToSource(markup),
        position + 1,
        undefined,
        undefined,
    );
}

function describe_(
    markup: string,
    position: number,
    op: (caret: Caret) => [unknown, Caret] | undefined,
): string | undefined {
    const before = caretIn(markup, position);
    const result = op(before);
    if (result === undefined) return undefined;
    return describeMarkupChange(before, result[1], DefaultLocales);
}

describe('formatting announcements name the format and the direction', () => {
    test.each([
        ['bold', 'bold on'],
        ['italic', 'italic on'],
        ['underline', 'underline on'],
        ['light', 'light on'],
        ['extra', 'extra on'],
    ] as [Format, string][])('adding %s says %j', (format, expected) => {
        expect(
            describe_('hello world', 6, (c) => toggleFormat(c, format)),
        ).toBe(expected);
    });

    test('removing bold says the opposite of adding it', () => {
        const off = describe_('*bold*', 3, (c) => toggleFormat(c, 'bold'));
        expect(off).toBe('bold off');
    });

    // The whole point: two consecutive firings of one command must differ.
    test('toggling bold on then off produces two different announcements', () => {
        const on = describe_('hello', 3, (c) => toggleFormat(c, 'bold'));
        const off = describe_('*hello*', 3, (c) => toggleFormat(c, 'bold'));
        expect(on).toBeDefined();
        expect(off).toBeDefined();
        expect(on).not.toBe(off);
    });
});

describe('other toggles also vary', () => {
    test('bullets announce both directions differently', () => {
        const on = describe_('first', 2, toggleBullet);
        const off = describe_('• first', 4, toggleBullet);
        expect(on).toBeDefined();
        expect(off).toBeDefined();
        expect(on).not.toBe(off);
    });

    test('highlight announces both directions differently', () => {
        const on = describe_('\\1 + 1\\', 3, toggleHighlight);
        const off = describe_('\\1 + 1\\⭐', 3, toggleHighlight);
        expect(on).toBeDefined();
        expect(off).toBeDefined();
        expect(on).not.toBe(off);
    });

    test('defect announces both directions differently', () => {
        const on = describe_('\\1 + 1\\', 3, toggleDefect);
        const off = describe_('\\1 + 1\\🪲', 3, toggleDefect);
        expect(on).toBeDefined();
        expect(off).toBeDefined();
        expect(on).not.toBe(off);
    });

    test('highlight and defect do not say the same thing', () => {
        expect(describe_('\\1 + 1\\', 3, toggleHighlight)).not.toBe(
            describe_('\\1 + 1\\', 3, toggleDefect),
        );
    });
});

describe('nothing changed means nothing is said', () => {
    test('an unchanged caret announces nothing', () => {
        const caret = caretIn('hello', 2);
        expect(
            describeMarkupChange(caret, caret, DefaultLocales),
        ).toBeUndefined();
    });
});
