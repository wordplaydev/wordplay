import type Conflict from '@conflicts/Conflict';
import { PossiblePII } from '@conflicts/PossiblePII';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { DOCS_SYMBOL } from '@parser/Symbols';
import Purpose from '../concepts/Purpose';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import Language from './Language';
import { LanguageTagged } from './LanguageTagged';
import Markup from './Markup';
import type { Grammar, Replacement } from './Node';
import { node, optional } from './Node';
import type Paragraph from './Paragraph';
import Sym from './Sym';
import Token from './Token';
import Words from './Words';

export default class Doc extends LanguageTagged {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language: Language | undefined;
    readonly separator: Token | undefined;

    constructor(
        open: Token,
        markup: Markup,
        close: Token | undefined,
        lang: Language | undefined = undefined,
        separator: Token | undefined = undefined,
    ) {
        super();

        this.open = open;
        this.markup = markup;
        this.close = close;
        this.language = lang;
        this.separator = separator;

        this.computeChildren();
    }

    static make(content?: Paragraph[], lang: Language | undefined = undefined) {
        return new Doc(
            new Token(DOCS_SYMBOL, Sym.Doc),
            new Markup(content ?? []),
            new Token(DOCS_SYMBOL, Sym.Doc),
            lang,
            undefined,
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleAppends() {
        return [Doc.make()];
    }

    getDescriptor(): NodeDescriptor {
        return 'Doc';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Doc), label: undefined },
            {
                name: 'markup',
                kind: node(Markup),
                label: undefined,
            },
            { name: 'close', kind: node(Sym.Doc), label: undefined },
            {
                name: 'language',
                kind: optional(node(Language)),
                label: () => (l) => l.term.language,
            },
            {
                name: 'separator',
                kind: optional(node(Sym.Separator)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Doc(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('markup', this.markup, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('separator', this.separator, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    withLanguage(language: Language) {
        return new Doc(this.open, this.markup, this.close, language);
    }

    hasLanguage() {
        return this.language !== undefined;
    }

    isLanguage(language: LanguageCode) {
        return this.language?.getLanguageCode() === language;
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

    static readonly LocalePath = (l: LocaleText) => l.node.Doc;
    getLocalePath() {
        return Doc.LocalePath;
    }

    getCharacter() {
        return Characters.Doc;
    }
}
