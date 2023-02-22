import ConceptLink from '../nodes/ConceptLink';
import { ConceptRegEx } from '../parser/Tokenizer';
import type LanguageCode from './LanguageCode';
import type NodeLink from './NodeLink';
import type ValueLink from './ValueLink';

type Part = string | NodeLink | ValueLink | ConceptLink;

export default class Explanation {
    readonly parts: Part[];

    constructor(parts: Part[]) {
        this.parts = parts;
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

    static as(...parts: Part[]) {
        // Translate any parts that refer to concept links as concept links.
        return new Explanation(
            parts.reduce((list: Part[], part: Part) => {
                if (typeof part === 'string' && part.indexOf('@') >= 0) {
                    const items: Part[] = [];
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
                        items.push(ConceptLink.make(concept.substring(1)));
                    }
                    // Add the remainder of the string to the list.
                    const rest = part.substring(index);
                    if (rest.length > 0) items.push(rest);

                    return [...list, ...items];
                } else return [...list, part];
            }, [])
        );
    }
}
