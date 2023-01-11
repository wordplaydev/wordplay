import type Conflict from '../conflicts/Conflict';
import type Translation from '../translations/Translation';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';

export default class Words extends Node {
    readonly open: Token | undefined;
    readonly words: Token | undefined;
    readonly close: Token | undefined;

    constructor(
        open: Token | undefined,
        words: Token | undefined,
        close: Token | undefined
    ) {
        super();

        this.open = open;
        this.words = words;
        this.close = close;
    }

    getGrammar(): Field[] {
        return [
            { name: 'open', types: [Token] },
            { name: 'words', types: [Token] },
            { name: 'close', types: [Token] },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Words(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('words', this.words, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Words;
    }

    isItalic() {
        return this.open?.is(TokenType.ITALIC);
    }
    isBold() {
        return this.open?.is(TokenType.BOLD);
    }
    isExtra() {
        return this.open?.is(TokenType.EXTRA);
    }

    getText() {
        return this.words?.getText() ?? '';
    }
}
