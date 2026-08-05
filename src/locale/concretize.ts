import Markup from '@nodes/Markup';
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
) => Markup;

export function concretizeOrUndefined(
    locales: Locales,
    template: string,
    inputs: Record<string, TemplateInput>,
): Markup | undefined {
    // Remove annotations first: an unwritten marker often precedes REAL
    // content — a locale's unwritten strings carry the en-US text after the
    // marker, and Locales.get annotates fallback strings the same way — and
    // that content must render, not be replaced by the TBD message. Only a
    // string with nothing after its annotations is truly unwritten.
    const content = withoutAnnotations(template);
    if (content === '' && (template === '' || isUnwritten(template)))
        return Markup.words(
            locales.getMultilingualText((l) => l.ui.template.unwritten),
        );
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

    // Now concretize the markup with the given inputs.
    return markup.concretize(locales, inputs);
}

export default function concretize(
    locales: Locales,
    template: string,
    inputs: Record<string, TemplateInput>,
): Markup {
    const concretized = concretizeOrUndefined(locales, template, inputs);
    if (concretized !== undefined) return concretized;

    // The template couldn't be concretized (usually an input with no value and
    // no fallback branch). Concretize the failure message itself rather than
    // taking its raw text, whose own `$template` placeholder would otherwise be
    // shown and spoken literally. Fall back to the bare template if even that
    // fails, so this can never recurse.
    const message = concretizeOrUndefined(
        locales,
        locales.getPrimaryPlainText((l) => l.ui.template.unparsable),
        { template },
    );
    return message ?? Markup.words(template);
}
