import type Conflict from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import { node, type Field, type Replacement } from './Node';
import Token from './Token';
import Characters from '../lore/BasisCharacters';
import { LINK_SYMBOL } from '../parser/Symbols';
import Symbol from './Sym';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type Locales from '../locale/Locales';
import { getCodepointFromString } from '../unicode/getCodepoint';

export const HexRegEx = /^[0-9a-fA-F]+$/;

export class ConceptName {
    readonly name: string;
    readonly property?: string;

    constructor(name: string, property?: string) {
        this.name = name;
        this.property = property;
    }
}

export class CodepointName {
    readonly codepoint: string;

    constructor(codepoint: string) {
        this.codepoint = codepoint;
    }
}

export class UIName {
    readonly id: string;

    constructor(id: string) {
        this.id = id;
    }
}

export default class ConceptLink extends Content {
    readonly concept: Token;

    constructor(concept: Token) {
        super();

        this.concept = concept;
    }

    static make(concept: string) {
        return new ConceptLink(
            new Token(`${LINK_SYMBOL}${concept}`, Symbol.Concept),
        );
    }

    getDescriptor() {
        return 'ConceptLink';
    }

    getName() {
        return this.concept.getText().slice(1);
    }

    getCodepoint() {
        const name = this.getName();
        if (name.match(HexRegEx)) return getCodepointFromString(name);
        return undefined;
    }

    parse(): ConceptName | CodepointName | UIName | undefined {
        const name = this.getName();
        if (name.match(HexRegEx)) {
            const codepoint = getCodepointFromString(name);
            return codepoint === undefined
                ? undefined
                : new CodepointName(codepoint);
        }
        const [concept, property] = name.split('/');
        if (concept === 'UI') return new UIName(concept);
        else return new ConceptName(concept, property);
    }

    /** Is valid if it refers to a concept key in the given Locale */
    isValid(locale: LocaleText) {
        const concept = this.parse();
        // Couldn't parse? Not valid.
        if (concept === undefined) return false;
        // Found a UI or codepoint? Valid.
        if (concept instanceof UIName || concept instanceof CodepointName)
            return true;

        // See which section of the locale has the concept name, if any.
        const section = [
            locale.node,
            locale.input,
            locale.output,
            locale.basis,
        ].find((c) => concept.name in c);

        // Valid if we found it, and no property was specified, or it was, and the concept has it.
        return (
            section !== undefined &&
            (concept.property === undefined ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                concept.property in
                    (section as Record<string, any>)[concept.name] ||
                (section === locale.basis &&
                    concept.property in
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (section as Record<string, any>)[concept.name]
                            .function))
        );
    }

    getGrammar(): Field[] {
        return [{ name: 'concept', kind: node(Symbol.Concept) }];
    }

    clone(replace?: Replacement | undefined): this {
        return new ConceptLink(
            this.replaceChild('concept', this.concept, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ConceptLink);
    }

    getCharacter() {
        return Characters.Link;
    }

    concretize(): ConceptLink {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}
