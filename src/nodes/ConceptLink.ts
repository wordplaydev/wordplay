import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import { node, type Field, type Replacement } from './Node';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import { LINK_SYMBOL } from '../parser/Symbols';
import Symbol from './Sym';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type Locales from '../locale/Locales';

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

    getDescriptor() {
        return 'ConceptLink';
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
        ].find((c) => name in c);

        // Valid if we found it, and no property was specified, or it was, and the concept has it.
        return (
            name === 'UI' ||
            (section !== undefined &&
                (prop === undefined ||
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    prop in (section as Record<string, any>)[name] ||
                    (section === locale.basis &&
                        prop in
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (section as Record<string, any>)[name].function)))
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.ConceptLink);
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
