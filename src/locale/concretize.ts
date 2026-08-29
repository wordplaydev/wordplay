import Markup, { type MarkupSource } from '@nodes/Markup';
import { toMarkup } from '@parser/toMarkup';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import { isUnwritten } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';

/** We maintain cache a mapping from template strings to compiled markup, since they are fixed structures.
 * We just reuse them with different inputs.*/
const TemplateToMarkupCache: Map<string, Markup> = new Map();

export type Concretizer = (
    locales: Locales,
    template: string,
    inputs: Record<string, TemplateInput>,
    /** Where the template came from, when a locale accessor named it. Optional so the
     *  existing concretizer still satisfies this type. */
    source?: MarkupSource,
) => Markup;

export function concretizeOrUndefined(
    locales: Locales,
    template: string,
    inputs: Record<string, TemplateInput>,
    source?: MarkupSource,
): Markup | undefined {
    // Remove annotations first: an unwritten marker often precedes REAL
    // content — a locale's unwritten strings carry the en-US text after the
    // marker, and Locales.get annotates fallback strings the same way — and
    // that content must render, not be replaced by the TBD message. Only a
    // string with nothing after its annotations is truly unwritten.
    const content = withoutAnnotations(template);
    if (content === '' && (template === '' || isUnwritten(template))) {
        const placeholder = Markup.words(
            locales.getMultilingualText((l) => l.ui.template.unwritten),
        );
        // An unwritten string is exactly the one a translator most needs to reach, so the
        // placeholder still reports the template it stands in for.
        return source === undefined
            ? placeholder
            : placeholder.withSource(source);
    }
    template = content;

    // Expand `$term` word-list references using this locale's terms before
    // parsing. Terms are locale constants, so the cache key becomes the
    // post-substitution string — correct per-locale (the cache is shared across
    // locales, and identical substituted strings yield identical markup).
    template = locales.resolveTerms(template);

    // See if we've cached this template.
    let markup = TemplateToMarkupCache.get(template);
    if (markup === undefined) {
        [markup] = toMarkup(template);
        TemplateToMarkupCache.set(template, markup);
    }

    // Now concretize the markup with the given inputs, stamping where the template came from.
    const concretized = markup.concretize(locales, inputs);
    return concretized === undefined || source === undefined
        ? concretized
        : concretized.withSource(source);
}

export default function concretize(
    locales: Locales,
    template: string,
    inputs: Record<string, TemplateInput>,
    source?: MarkupSource,
): Markup {
    const concretized = concretizeOrUndefined(
        locales,
        template,
        inputs,
        source,
    );
    if (concretized !== undefined) return concretized;

    // The template couldn't be concretized (usually an input with no value and
    // no fallback branch). Concretize the failure message itself rather than
    // taking its raw text, whose own `$template` placeholder would otherwise be
    // shown and spoken literally. Fall back to the bare template if even that
    // fails, so this can never recurse.
    // Carry the *original* source, not this message's own: the string a translator needs to
    // fix is the template that failed, not the failure notice.
    const message = concretizeOrUndefined(
        locales,
        locales.getPrimaryPlainText((l) => l.ui.template.unparsable),
        { template },
        source,
    );
    if (message !== undefined) return message;
    const bare = Markup.words(template);
    return source === undefined ? bare : bare.withSource(source);
}
