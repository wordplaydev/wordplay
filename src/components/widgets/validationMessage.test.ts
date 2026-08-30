import { describe, expect, test } from 'vitest';

import placeValidationMessage from '@components/widgets/validationMessage';

/**
 * The placement rules a validation message obeys, which differ from a
 * tooltip's on both axes — see the module comment.
 */

const viewport = { width: 1000, height: 800 };
const panel = { width: 200, height: 50 };

function box(left: number, top: number, width = 120, height = 20) {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
    };
}

describe('placeValidationMessage', () => {
    test('sits below the field, starting where the field starts', () => {
        const at = placeValidationMessage(box(300, 100), panel, viewport);
        expect(at.left).toBe(300);
        expect(at.top).toBe(124);
    });

    test('goes above when there is no room below', () => {
        const at = placeValidationMessage(box(300, 760), panel, viewport);
        expect(at.top).toBe(760 - 50 - 4);
    });

    test('never runs off the end of the viewport', () => {
        const at = placeValidationMessage(box(950, 100), panel, viewport);
        expect(at.left).toBe(1000 - 200 - 4);
    });

    test('nor off the start of it', () => {
        const at = placeValidationMessage(box(-40, 100), panel, viewport);
        expect(at.left).toBe(4);
    });

    test('starts at the field’s right edge when the field reads right to left', () => {
        const at = placeValidationMessage(
            box(300, 100),
            { width: 80, height: 50 },
            viewport,
            false,
            true,
        );
        // The field's inline start is its right edge, so the message's own
        // right edge lines up with it.
        expect(at.left + 80).toBe(300 + 120);
    });

    test('sits beside the field when asked, at its inline end', () => {
        const at = placeValidationMessage(box(300, 100), panel, viewport, true);
        expect(at.left).toBe(300 + 120 + 4);
        expect(at.top).toBe(100);
    });

    test('falls back below when there is no room beside', () => {
        const at = placeValidationMessage(box(900, 100), panel, viewport, true);
        expect(at.top).toBe(124);
    });

    test('beside on the other side when the field reads right to left', () => {
        const at = placeValidationMessage(
            box(500, 100),
            panel,
            viewport,
            true,
            true,
        );
        expect(at.left + panel.width + 4).toBe(500);
    });
});
