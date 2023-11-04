import type Conflict from '@conflicts/Conflict';
import Purpose from '../concepts/Purpose';
import Glyphs from '../lore/Glyphs';
import {
    LINK_SYMBOL,
    TAG_CLOSE_SYMBOL,
    TAG_OPEN_SYMBOL,
} from '../parser/Symbols';
import { node, type Grammar, type Replacement } from './Node';
import Token from './Token';
import Sym from './Sym';
import type { TemplateInput } from '../locale/concretize';
import Content from './Content';
import type Locales from '../locale/Locales';

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
            new Token(TAG_OPEN_SYMBOL, Sym.TagOpen),
            new Token(description, Sym.Words),
            new Token(LINK_SYMBOL, Sym.Link),
            new Token(url, Sym.URL),
            new Token(TAG_CLOSE_SYMBOL, Sym.TagClose)
        );
    }

    static getPossibleNodes() {
        return [WebLink.make('...', 'https://')];
    }

    getDescriptor() {
        return 'WebLink';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.TagOpen) },
            { name: 'description', kind: node(Sym.Words) },
            { name: 'at', kind: node(Sym.Link) },
            { name: 'url', kind: node(Sym.URL) },
            { name: 'close', kind: node(Sym.TagClose) },
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.WebLink);
    }

    getGlyphs() {
        return Glyphs.Link;
    }

    getDescriptionInputs(): TemplateInput[] {
        return [this.url?.getText()];
    }

    concretize(): WebLink {
        return this;
    }

    toText() {
        return this.description?.getText() ?? '';
    }
}
