import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import { node, type Field, type Replacement } from './Node';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import { LINK_SYMBOL } from '../parser/Symbols';
import Symbol from './Symbol';
import Purpose from '../concepts/Purpose';
import Content from './Content';

export default class ConceptLink extends Content {
    readonly concept: Token;

    constructor(concept: Token) {
        super();

        this.concept = concept;
    }

    static make(concept: string) {
        return new ConceptLink(
            new Token(`${LINK_SYMBOL}${concept}`, Symbol.Concept)
        );
    }

    getName() {
        return this.concept.getText().slice(1);
    }

    /** Is valid if it refers to a concept key in the given Locale */
    isValid(locale: Locale) {
        const [name, prop] = this.getName().split('/');

        // See which section of the locale has the concept name, if any.
        const section = [
            locale.node,
            locale.input,
            locale.output,
            locale.basis,
        ].find((c) => c.hasOwnProperty(name)) as Record<string, any>;

        // Valid if we found it, and no property was specified, or it was, and the concept has it.
        return (
            name === 'UI' ||
            (section !== undefined &&
                (prop === undefined ||
                    section[name].hasOwnProperty(prop) ||
                    (section === locale.basis &&
                        section[name].function.hasOwnProperty(prop))))
        );
    }

    getGrammar(): Field[] {
        return [{ name: 'concept', kind: node(Symbol.Concept) }];
    }

    clone(replace?: Replacement | undefined): this {
        return new ConceptLink(
            this.replaceChild('concept', this.concept, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    getNodeLocale(translation: Locale) {
        return translation.node.ConceptLink;
    }

    getGlyphs() {
        return Glyphs.Link;
    }

    concretize(): ConceptLink {
        return this;
    }

    toText() {
        return this.toWordplay();
    }
}
