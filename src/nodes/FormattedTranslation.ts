import type Conflict from '@conflicts/Conflict';
import { PossiblePII } from '@conflicts/PossiblePII';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { FORMATTED_SYMBOL } from '@parser/Symbols';
import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import Example from './Example';
import Language from './Language';
import { LanguageTagged } from './LanguageTagged';
import Markup from './Markup';
import type { Grammar, Replacement } from './Node';
import { node, optional } from './Node';
import type Paragraph from './Paragraph';
import Sym from './Sym';
import Token from './Token';
import Words from './Words';

export default class FormattedTranslation extends LanguageTagged {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language: Language | undefined;
    readonly separator: Token | undefined;

    constructor(
        open: Token,
        markup: Markup,
        close: Token | undefined,
        lang: Language | undefined,
        separator: Token | undefined,
    ) {
        super();

        this.open = open;
        this.markup = markup;
        this.close = close;
        this.language = lang;
        this.separator = separator;

        this.computeChildren();
    }

    static make(content?: Paragraph[], language?: Language) {
        return new FormattedTranslation(
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            new Markup(content ?? []),
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            language,
            undefined,
        );
    }

    static getPossibleReplacements() {
        return [FormattedTranslation.make()];
    }

    static getPossibleAppends() {
        return this.getPossibleReplacements();
    }

    getDescriptor(): NodeDescriptor {
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
            { name: 'separator', kind: optional(node(Sym.Separator)) },
        ];
    }

    clone(replace?: Replacement) {
        return new FormattedTranslation(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('markup', this.markup, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('separator', this.separator, replace),
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
            this.separator,
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

    static readonly LocalePath = (l: LocaleText) => l.node.FormattedTranslation;
    getLocalePath() {
        return FormattedTranslation.LocalePath;
    }

    getCharacter() {
        return Characters.Formatted;
    }
}
