import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import Purpose from '../concepts/Purpose';
import Glyphs from '../lore/Glyphs';
import {
    LINK_SYMBOL,
    TAG_CLOSE_SYMBOL,
    TAG_OPEN_SYMBOL,
} from '../parser/Symbols';
import type { Field, Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import type { TemplateInput } from '../locale/concretize';
import type Context from './Context';
import Content from './Content';

export default class WebLink extends Content {
    readonly open: Token;
    readonly description: Token | undefined;
    readonly at: Token | undefined;
    readonly url: Token | undefined;
    readonly close: Token | undefined;

    constructor(
        open: Token,
        description: Token | undefined,
        at: Token | undefined,
        url: Token | undefined,
        close: Token | undefined
    ) {
        super();

        this.open = open;
        this.description = description;
        this.at = at;
        this.url = url;
        this.close = close;
    }

    static make(description: string, url: string) {
        return new WebLink(
            new Token(TAG_OPEN_SYMBOL, TokenType.TagOpen),
            new Token(description, TokenType.Words),
            new Token(LINK_SYMBOL, TokenType.Link),
            new Token(url, TokenType.URL),
            new Token(TAG_CLOSE_SYMBOL, TokenType.TagClose)
        );
    }

    getGrammar(): Field[] {
        return [
            { name: 'open', types: [TokenType.TagOpen] },
            { name: 'description', types: [TokenType.Words] },
            { name: 'at', types: [TokenType.Link] },
            { name: 'url', types: [TokenType.URL] },
            { name: 'close', types: [TokenType.TagClose] },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new WebLink(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('description', this.description, replace),
            this.replaceChild('at', this.at, replace),
            this.replaceChild('url', this.url, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.WebLink;
    }

    getGlyphs() {
        return Glyphs.Link;
    }

    getDescriptionInputs(_: Locale, __: Context): TemplateInput[] {
        return [this.url?.getText()];
    }

    concretize(_: Locale, __: TemplateInput[]): WebLink {
        return this;
    }

    toText() {
        return this.description?.getText() ?? '';
    }
}
