import type Locales from '@locale/Locales';
import type Example from '@nodes/Example';
import { kitExamples } from '@nodes/publishedShare';
import Source from '@nodes/Source';

/**
 * The example a kit's registry tile should render (#8): a starred `⭐` one wins, otherwise
 * the first in {@link kitExamples}' order, which prefers the source's own doc — where a
 * kit's headline example belongs — over its exports'.
 *
 * `undefined` only when the source has no example anywhere, which `UnexampledKit` refuses
 * to publish.
 */
export function pickKitPreviewExample(source: Source): Example | undefined {
    const examples = kitExamples(source);
    return (
        examples.find((example) => example.highlight !== undefined) ??
        examples[0]
    );
}

/**
 * A throwaway project that evaluates one of a kit's examples, appended to the kit's own
 * code because an example means what it means *there*: `\Phrase(sunset)\` needs `sunset`.
 * A block's value is its last statement, so appending makes the example the value.
 *
 * Safe to do textually, since a kit borrows nothing (`KitCannotBorrow`).
 */
export function kitPreviewSource(source: Source, example: Example): Source {
    const code = source.getCode().toString();
    const shown = example.program.toWordplay(source.spaces).trim();
    return new Source(source.names, `${code}\n${shown}`);
}

/**
 * A kit's description: the first sentence of its source's own doc, derived rather than
 * typed into a field of its own, exactly as a project tile derives its description from
 * its main source — so it cannot drift from the code.
 *
 * Written onto the kit at publish, so the registry tile and the word index need no parse.
 */
export function kitDescription(source: Source, locales: Locales): string {
    // The reader's doc, not the first one written. A kit's docs carry an option per
    // language, so `docs[0]` is whatever language the author wrote first — which would
    // have shown every reader the registry description in that language however many
    // translations the kit carries.
    return (
        source.expression.docs
            .getPreferredLocale(locales)
            ?.markup.getFirstSentence(locales)
            ?.toText()
            .trim() ?? ''
    );
}
