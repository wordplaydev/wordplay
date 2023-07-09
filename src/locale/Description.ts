import ConceptRegEx from '../parser/ConceptRegEx';
import ConceptRef from './ConceptRef';
import type LanguageCode from './LanguageCode';
import type NodeRef from './NodeRef';
import type ValueRef from './ValueRef';
import type { TemplateInput } from './concretize';

export type DescriptionPart =
    | string
    | number
    | boolean
    | undefined
    | NodeRef
    | ValueRef
    | ConceptRef;

export default class Description {
    readonly parts: DescriptionPart[];

    constructor(parts: DescriptionPart[]) {
        // Translate any parts that refer to concept links as concept links.
        this.parts = parts.reduce(
            (list: DescriptionPart[], part: DescriptionPart) => {
                if (typeof part === 'string' && part.indexOf('@') >= 0) {
                    const items: DescriptionPart[] = [];
                    let index = 0;
                    for (const match of part.matchAll(
                        new RegExp(ConceptRegEx, 'g')
                    )) {
                        // Add the part before the match if it's not empty.
                        const before = part.substring(index, match.index);
                        if (before.length > 0) items.push(before);
                        const concept = match[0];
                        // Advance the index by the length of the before and the concept.
                        index += before.length + concept.length;
                        // Add a concept link for the match.
                        items.push(new ConceptRef(concept.substring(1)));
                    }
                    // Add the remainder of the string to the list.
                    const rest = part.substring(index);
                    if (rest.length > 0) items.push(rest);

                    return [...list, ...items];
                } else return [...list, part];
            },
            []
        );
    }

    getTextContaining(
        languageCode: LanguageCode,
        text: string
    ): [string, number] | undefined {
        const match = this.parts.find(
            (part): part is string =>
                typeof part === 'string' &&
                part.toLocaleLowerCase(languageCode).indexOf(text) >= 0
        );
        return match
            ? [match, match.toLocaleLowerCase(languageCode).indexOf(text)]
            : undefined;
    }

    with(part: TemplateInput) {
        return new Description([
            ...this.parts,
            ...(part instanceof Description ? part.parts : [part]),
        ]);
    }

    toString() {
        return this.parts
            .map((part) => (part === undefined ? '?' : part.toString()))
            .join('');
    }

    static as(part: DescriptionPart) {
        return new Description([part]);
    }
}
