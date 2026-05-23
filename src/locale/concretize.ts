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
            locales.getUnannotatedText((l) => l.ui.template.unwritten),
        );

    // Remove annotations.
    template = withoutAnnotations(template);

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
            `${locales.getUnannotatedText((l) => l.ui.template.unparsable)}: ${template}`,
        )
    );
}
