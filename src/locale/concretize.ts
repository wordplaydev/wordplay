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
    // Not written? Return the TBD string.
    if (template === '' || isUnwritten(template))
        return Markup.words(
            locales.getMultilingualText((l) => l.ui.template.unwritten),
        );

    // Remove annotations.
    template = withoutAnnotations(template);

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
    return (
        concretizeOrUndefined(locales, template, inputs) ??
        Markup.words(
            `${locales.getMultilingualText((l) => l.ui.template.unparsable)}: ${template}`,
        )
    );
}
