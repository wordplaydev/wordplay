import type { TemplateInput } from './Locales';
import type Locales from './Locales';
import { isUnwritten, withoutAnnotations } from './LocaleText';
import { toMarkup } from '@parser/toMarkup';
import Markup from '@nodes/Markup';

/** We maintain cache a mapping from template strings to compiled markup, since they are fixed structures.
 * We just reuse them with different inputs.*/
const TemplateToMarkupCache: Map<string, Markup> = new Map();

export type Concretizer = (
    locales: Locales,
    template: string,
    ...inputs: TemplateInput[]
) => Markup;

export function concretizeOrUndefined(
    locales: Locales,
    template: string,
    ...inputs: TemplateInput[]
): Markup | undefined {
    // Not written? Return the TBD string.
    if (template === '' || isUnwritten(template))
        return Markup.words(locales.get((l) => l.ui.template.unwritten));

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
    ...inputs: TemplateInput[]
): Markup {
    return (
        concretizeOrUndefined(locales, template, ...inputs) ??
        Markup.words(
            `${locales.get((l) => l.ui.template.unparsable)}: ${template}`,
        )
    );
}
