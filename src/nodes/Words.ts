import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import Purpose from '../concepts/Purpose';
import Glyphs from '../lore/Glyphs';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import { unescaped } from './TextLiteral';

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

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Words;
    }

    isItalic() {
        return this.open?.is(TokenType.Italic);
    }

    isBold() {
        return this.open?.is(TokenType.Bold);
    }

    isExtra() {
        return this.open?.is(TokenType.Extra);
    }

    getText() {
        return unescaped(this.words?.getText() ?? '');
    }

    containsText(text: string) {
        return this.words && this.words.containsText(text);
    }

    getGlyphs() {
        return Glyphs.Words;
    }
}
