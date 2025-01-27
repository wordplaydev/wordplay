import Language from './Language';
import { node, optional } from './Node';
import type { Grammar, Replacement } from './Node';
import Token from './Token';
import { DOCS_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import type Paragraph from './Paragraph';
import Words from './Words';
import Characters from '../lore/BasisCharacters';
import Purpose from '../concepts/Purpose';
import Markup from './Markup';
import { LanguageTagged } from './LanguageTagged';
import type Locales from '../locale/Locales';
import type Conflict from '@conflicts/Conflict';
import { PossiblePII } from '@conflicts/PossiblePII';
import type Context from './Context';
import type LanguageCode from '@locale/LanguageCode';
import type { NodeDescriptor } from '@locale/NodeTexts';

export default class Doc extends LanguageTagged {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language?: Language;
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
            { name: 'open', kind: node(Sym.Doc) },
            { name: 'markup', kind: node(Markup) },
            { name: 'close', kind: node(Sym.Doc) },
            { name: 'language', kind: optional(node(Language)) },
            { name: 'separator', kind: optional(node(Sym.Separator)) },
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Doc);
    }

    getCharacter() {
        return Characters.Doc;
    }
}
