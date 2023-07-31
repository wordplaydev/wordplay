import Language from './Language';
import Node, { any, node, none } from './Node';
import type { Grammar, Replacement } from './Node';
import Token from './Token';
import type Locale from '@locale/Locale';
import { DOCS_SYMBOL } from '@parser/Symbols';
import Symbol from './Symbol';
import type Paragraph from './Paragraph';
import Words from './Words';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Markup from './Markup';

export default class Doc extends Node {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language?: Language;

    constructor(
        open: Token,
        markup: Markup,
        close: Token | undefined,
        lang: Language | undefined
    ) {
        super();

        this.open = open;
        this.markup = markup;
        this.close = close;
        this.language = lang;

        this.computeChildren();
    }

    static make(content?: Paragraph[]) {
        return new Doc(
            new Token(DOCS_SYMBOL, Symbol.Doc),
            new Markup(content ?? []),
            new Token(DOCS_SYMBOL, Symbol.Doc),
            undefined
        );
    }

    static getPossibleNodes() {
        return [Doc.make()];
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.Doc) },
            { name: 'markup', kind: node(Markup) },
            { name: 'close', kind: node(Symbol.Doc) },
            { name: 'language', kind: any(node(Language), none()) },
        ];
    }

    clone(replace?: Replacement) {
        return new Doc(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('markup', this.markup, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    withLanguage(language: Language) {
        return new Doc(this.open, this.markup, this.close, language);
    }

    getFirstParagraph(): string {
        const first: Paragraph | undefined = this.markup.paragraphs[0];
        return first === undefined
            ? ''
            : (first.nodes((n) => n instanceof Words) as Words[])
                  .map((w) => w.toText())
                  .join();
    }

    getLanguage() {
        return this.language === undefined
            ? undefined
            : this.language.getLanguageText();
    }

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.Doc;
    }

    getGlyphs() {
        return Glyphs.Doc;
    }
}
