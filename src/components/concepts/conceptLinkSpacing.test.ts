import { compile } from 'svelte/compiler';
import fs from 'fs';
import { describe, expect, test } from 'vitest';

/**
 * A concept link must not carry whitespace of its own.
 *
 * Markup already holds the space before a link — the words run `for a ` ends with one —
 * so a newline between the bookmark branch and the `<button>` in the template becomes a
 * second one. Prose hides it, because HTML collapses runs of whitespace, but the editor
 * renders code with `white-space: pre`, where `for a @Phrase` shows as `for a  @Phrase`.
 * That is why this is checked against the compiled template rather than by eye.
 */

/** The client-side template strings a component compiles to. */
function templates(path: string): string[] {
    const { js } = compile(fs.readFileSync(path, 'utf8'), {
        generate: 'client',
        filename: path,
    });
    return [
        ...js.code.matchAll(
            /from_html\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')/g,
        ),
    ].map((match) => match[1].slice(1, -1));
}

describe('a concept link renders without stray whitespace', () => {
    const found = templates('src/components/concepts/ConceptLinkUI.svelte');

    test('the compiled component has a template with the link button', () => {
        // Guards the test itself: a renamed class would otherwise make it vacuous.
        expect(found.some((t) => t.includes('<button'))).toBe(true);
    });

    test('nothing sits between the link button and what precedes it', () => {
        for (const template of found)
            expect(template, template).not.toMatch(/\s<button/);
    });

    test('the button is not followed by whitespace either', () => {
        for (const template of found)
            expect(template, template).not.toMatch(/<\/button>\s/);
    });
});
