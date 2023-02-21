import type Conflict from '@conflicts/Conflict';
import type Translation from '@translation/Translation';
import Glyphs from '../lore/Glyphs';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';

export default class WebLink extends Node {
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

    getGrammar(): Field[] {
        return [
            { name: 'open', types: [Token] },
            { name: 'description', types: [Token] },
            { name: 'at', types: [Token] },
            { name: 'url', types: [Token] },
            { name: 'close', types: [Token] },
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

    getNodeTranslation(translation: Translation) {
        return translation.nodes.WebLink;
    }

    getGlyphs() {
        return Glyphs.Link;
    }
}
