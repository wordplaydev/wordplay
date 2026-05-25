import { describe, expect, test } from 'vitest';
import { toMarkup } from '@parser/toMarkup';
import { pickPreviewExample } from './pickPreviewExample';

describe('pickPreviewExample', () => {
    test('returns undefined when there are no examples', () => {
        const [markup] = toMarkup('plain text, no embedded examples');
        expect(pickPreviewExample(markup)).toBeUndefined();
    });

    test('returns the first example when none are starred', () => {
        const [markup] = toMarkup(
            'intro paragraph\n\n\\1 + 1\\\n\nanother one\n\n\\2 + 2\\',
        );
        const picked = pickPreviewExample(markup);
        expect(picked).toBeDefined();
        expect(picked?.program.toWordplay()).toBe('1+1');
    });

    test('prefers the starred example over the first one', () => {
        // Two examples in order: `1 + 1` first, `2 + 2` starred (`⭐` after
        // the closing `\`). The starred one must win.
        const [markup] = toMarkup(
            'intro paragraph\n\n\\1 + 1\\\n\nstarred one\n\n\\2 + 2\\⭐',
        );
        const picked = pickPreviewExample(markup);
        expect(picked).toBeDefined();
        expect(picked?.program.toWordplay()).toBe('2+2');
        expect(picked?.highlight).toBeDefined();
    });

    test('the "highlight" keyword form of the star also wins', () => {
        // The parser accepts both `⭐` and the literal word `highlight`.
        const [markup] = toMarkup(
            '\\1 + 1\\\n\nstarred via keyword\n\n\\2 + 2\\highlight',
        );
        const picked = pickPreviewExample(markup);
        expect(picked).toBeDefined();
        expect(picked?.program.toWordplay()).toBe('2+2');
    });
});
