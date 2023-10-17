import Markup from '../nodes/Markup';
import { toMarkup } from '../parser/toMarkup';
import type Locales from './Locales';
import type NodeRef from './NodeRef';
import type ValueRef from './ValueRef';

export type TemplateInput =
    | number
    | boolean
    | string
    | undefined
    | NodeRef
    | ValueRef;

/** We maintain cache a mapping from template strings to compiled markup, since they are fixed structures.
 * We just reuse them with different inputs.*/
const TemplateToMarkupCache: Map<string, Markup> = new Map();

/**
 * Takes a localization templae and converts it to a concrete string.
 * The syntax is as follows.
 * To indicate that the string has not yet been written, write an empty string or "$?":
 *
 *      ""
 *      "$?"
 *
 * To refer to an input, use a $, followed by the number of the input desired,
 * starting from 1.
 *
 *      "Hello, my name is $1"
 *
 * To indicate that you want to reuse a common phrase defined in a locale's "terminology" dictionary,
 * use a $ followed by any number of word characters (in regex, /\$\w/). This allows
 * for terminology to be changed globally without search and replace.
 *
 *      "To create a new $program, click here."
 *
 * To conditionally select a string, use ??, followed by an input that is either a boolean or possibly undefined value,
 * and true and false cases
 *
 *      "I received $1 ?? [$1 | nothing]"
 *      "I received $1 ?? [$2 ?? [$1 | $2] | nothinge]"
 *
 * To indicate that you want a literal reserved symbol, use two of them:
 *
 *      "$$"
 *      "[["
 *      "]]"
 *      "||"
 */
export default function concretize(
    /** The locales, in case we need to generate errors */
    locales: Locales,
    /** The string to localize */
    template: string,
    /** The inputs to use to concretize */
    ...inputs: TemplateInput[]
): Markup {
    return (
        concretizeOrUndefined(locales, template, ...inputs) ??
        // Create a representation of a template that couldn't be concretized.
        Markup.words(
            `${locales.get((l) => l.ui.template.unparsable)}: ${template}`
        )
    );
}

export function concretizeOrUndefined(
    locales: Locales,
    template: string,
    ...inputs: TemplateInput[]
): Markup | undefined {
    // Not written? Return the TBD string.
    if (template === '' || template === '$?')
        return Markup.words(locales.get((l) => l.ui.template.unwritten));

    // See if we've cached this template.
    let markup = TemplateToMarkupCache.get(template);
    if (markup === undefined) {
        [markup] = toMarkup(template);
        TemplateToMarkupCache.set(template, markup);
    }

    // Now concretize the markup with the given inputs.
    return markup.concretize(locales, inputs);
}
