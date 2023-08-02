import Language from './Language';
import { node, optional } from './Node';
import type { Grammar, Replacement } from './Node';
import Token from './Token';
import type Locale from '@locale/Locale';
import { FORMATTED_SYMBOL } from '@parser/Symbols';
import Symbol from './Symbol';
import type Paragraph from './Paragraph';
import Words from './Words';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Markup from './Markup';
import { LanguageTagged } from './LanguageTagged';
import Example from './Example';

export default class FormattedTranslation extends LanguageTagged {
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
        return new FormattedTranslation(
            new Token(FORMATTED_SYMBOL, Symbol.Formatted),
            new Markup(content ?? []),
            new Token(FORMATTED_SYMBOL, Symbol.Formatted),
            undefined
        );
    }

    static getPossibleNodes() {
        return [FormattedTranslation.make()];
    }

    getExamples() {
        return this.markup
            .nodes()
            .filter(
                (example): example is Example => example instanceof Example
            );
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.Formatted) },
            { name: 'markup', kind: node(Markup) },
            { name: 'close', kind: node(Symbol.Formatted) },
            { name: 'language', kind: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement) {
        return new FormattedTranslation(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('markup', this.markup, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Value;
    }

    withLanguage(language: Language) {
        return new FormattedTranslation(
            this.open,
            this.markup,
            this.close,
            language
        );
    }

    getFirstParagraph(): string {
        const first: Paragraph | undefined = this.markup.paragraphs[0];
        return first === undefined
            ? ''
            : (first.nodes((n) => n instanceof Words) as Words[])
                  .map((w) => w.toText())
                  .join();
    }

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.FormattedTranslation;
    }

    getGlyphs() {
        return Glyphs.Formatted;
    }
}
