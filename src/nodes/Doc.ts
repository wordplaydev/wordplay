import Language from './Language';
import Node, { type Replacement } from './Node';
import Token from './Token';
import type Translation from '../translation/Translation';
import { DOCS_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';
import Paragraph from './Paragraph';
import Words from './Words';

export default class Doc extends Node {
    readonly open: Token;
    readonly paragraphs: Paragraph[];
    readonly close: Token | undefined;
    readonly lang?: Language;

    constructor(
        open: Token,
        content: Paragraph[],
        close: Token | undefined,
        lang: Language | undefined
    ) {
        super();

        this.open = open;
        this.paragraphs = content;
        this.close = close;
        this.lang = lang;

        this.computeChildren();
    }

    static make(content: Paragraph[]) {
        return new Doc(
            new Token(DOCS_SYMBOL, TokenType.DOC),
            content,
            new Token(DOCS_SYMBOL, TokenType.DOC),
            undefined
        );
    }

    getGrammar() {
        return [
            { name: 'open', types: [Token] },
            { name: 'paragraphs', types: [[Paragraph]] },
            { name: 'close', types: [Token] },
            { name: 'lang', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new Doc(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('paragraphs', this.paragraphs, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('lang', this.lang, replace)
        ) as this;
    }

    withLanguage(language: Language) {
        return new Doc(this.open, this.paragraphs, this.close, language);
    }

    getFirstParagraph(): string {
        const first: Paragraph | undefined = this.paragraphs[0];
        return first === undefined
            ? ''
            : (first.nodes((n) => n instanceof Words) as Words[])
                  .map((w) => w.getText())
                  .join();
    }

    getLanguage() {
        return this.lang === undefined ? undefined : this.lang.getLanguage();
    }

    computeConflicts() {}

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Doc;
    }
}
