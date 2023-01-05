import Language from './Language';
import Node, { type Replacement } from './Node';
import Token from './Token';
import DocToken from './DocToken';
import type Translation from '../translations/Translation';

export default class Doc extends Node {
    readonly docs: Token;
    readonly lang?: Language;

    constructor(docs?: Token | string, lang?: Language | string) {
        super();

        this.docs = docs instanceof Token ? docs : new DocToken(docs ?? '');
        this.lang =
            lang instanceof Language
                ? lang
                : lang === undefined
                ? undefined
                : Language.make(lang ?? '');

        this.computeChildren();
    }

    getGrammar() {
        return [
            { name: 'docs', types: [Token] },
            { name: 'lang', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new Doc(
            this.replaceChild('docs', this.docs, replace),
            this.replaceChild('lang', this.lang, replace)
        ) as this;
    }

    getText() {
        return this.docs.getText();
    }
    getLanguage() {
        return this.lang === undefined ? undefined : this.lang.getLanguage();
    }

    computeConflicts() {}

    getDescription(translation: Translation) {
        return translation.nodes.Doc.description;
    }
}
