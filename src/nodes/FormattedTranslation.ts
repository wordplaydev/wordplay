import Language from './Language';
import { node, optional } from './Node';
import type { Grammar, Replacement } from './Node';
import Token from './Token';
import { FORMATTED_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import type Paragraph from './Paragraph';
import Words from './Words';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Markup from './Markup';
import { LanguageTagged } from './LanguageTagged';
import Example from './Example';
import type Locales from '../locale/Locales';
import type Conflict from '@conflicts/Conflict';
import { PossiblePII } from '@conflicts/PossiblePII';
import type Context from './Context';

export default class FormattedTranslation extends LanguageTagged {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language?: Language;

    constructor(
        open: Token,
        markup: Markup,
        close: Token | undefined,
        lang: Language | undefined,
    ) {
        super();

        this.open = open;
        this.markup = markup;
        this.close = close;
        this.language = lang;

        this.computeChildren();
    }

    static make(content?: Paragraph[], language?: Language) {
        return new FormattedTranslation(
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            new Markup(content ?? []),
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            language,
        );
    }

    static getPossibleNodes() {
        return [FormattedTranslation.make()];
    }

    getDescriptor() {
        return 'FormattedTranslation';
    }

    getExamples() {
        return this.markup
            .nodes()
            .filter(
                (example): example is Example => example instanceof Example,
            );
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Formatted) },
            { name: 'markup', kind: node(Markup) },
            { name: 'close', kind: node(Sym.Formatted) },
            { name: 'language', kind: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement) {
        return new FormattedTranslation(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('markup', this.markup, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace),
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
            language,
        );
    }

    getFirstParagraph(): string {
        const first: Paragraph | undefined = this.markup.paragraphs[0];
        return first === undefined
            ? ''
            : first
                  .nodes((n): n is Words => n instanceof Words)
                  .map((w) => w.toText())
                  .join();
    }

    computeConflicts(context: Context): Conflict[] {
        return PossiblePII.analyze(this, context);
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.FormattedTranslation);
    }

    getGlyphs() {
        return Glyphs.Formatted;
    }
}
