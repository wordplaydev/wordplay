import type Example from '@nodes/Example';
import type Markup from '@nodes/Markup';

/**
 * Pick the example that should drive a how-to's preview tile. A how-to
 * author can "star" an example by appending `⭐` (or `highlight`) after
 * its closing `\`; that highlighted example wins. Otherwise we fall back
 * to the first example in the markup. Returns `undefined` if the markup
 * has no examples at all (the caller renders a plain-text fallback).
 *
 * Extracted from HowToPreview.svelte's inline derivation so the priority
 * is independently testable. See parseExample in src/parser/parseMarkup.ts
 * for how the `⭐` token gets attached to {@link Example.highlight}.
 */
export function pickPreviewExample(markup: Markup): Example | undefined {
    const examples = markup.getExamples();
    return (
        examples.find((example) => example.highlight !== undefined) ??
        examples[0]
    );
}
