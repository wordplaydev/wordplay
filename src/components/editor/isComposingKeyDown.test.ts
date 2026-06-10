import { describe, expect, test } from 'vitest';
import isComposingKeyDown from './isComposingKeyDown';

describe('isComposingKeyDown', () => {
    test('treats event.isComposing as a composition key', () => {
        expect(isComposingKeyDown({ isComposing: true, keyCode: 0 })).toBe(
            true,
        );
    });

    test('treats keyCode 229 as a composition key even when isComposing is false', () => {
        // The #1054 case: macOS Chrome 2-Set Korean reports isComposing:false on
        // some syllable-boundary keydowns, but keyCode stays 229.
        expect(isComposingKeyDown({ isComposing: false, keyCode: 229 })).toBe(
            true,
        );
    });

    test('does not treat a real navigation key as a composition key', () => {
        // ArrowLeft after a stuck composition must be allowed to recover it.
        expect(isComposingKeyDown({ isComposing: false, keyCode: 37 })).toBe(
            false,
        );
    });

    test('does not treat plain Latin typing as a composition key', () => {
        expect(isComposingKeyDown({ isComposing: false, keyCode: 68 })).toBe(
            false,
        );
    });
});
