import type LanguageCode from './LanguageCode';
import type NodeLink from './NodeLink';
import type ValueLink from './ValueLink';

type Part = string | NodeLink | ValueLink;

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
        return new Explanation(parts);
    }
}
