import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import Purpose from '../concepts/Purpose';
import Glyphs from '../lore/Glyphs';
import Node, { type Field, type Replacement } from './Node';
import Token from './Token';
import TokenType from './TokenType';
import { unescaped } from './TextLiteral';
import Example from './Example';
import WebLink from './WebLink';
import ConceptLink from './ConceptLink';

export type Segment = Token | Words | WebLink | ConceptLink | Example;

export default class Words extends Node {
    readonly open: Token | undefined;
    readonly segments: Segment[];
    readonly close: Token | undefined;

    constructor(
        open: Token | undefined,
        words: Segment[],
        close: Token | undefined
    ) {
        super();

        this.open = open;
        this.segments = words;
        this.close = close;
    }

    getGrammar(): Field[] {
        return [
            { name: 'open', types: [Token] },
            { name: 'segments', types: [Words, WebLink, ConceptLink, Example] },
            { name: 'close', types: [Token] },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Words(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('segments', this.segments, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Words;
    }

    getFormat():
        | 'italic'
        | 'underline'
        | 'light'
        | 'bold'
        | 'extra'
        | undefined {
        return this.open === undefined
            ? undefined
            : this.open.is(TokenType.Italic)
            ? 'italic'
            : this.open.is(TokenType.Underline)
            ? 'underline'
            : this.open.is(TokenType.Light)
            ? 'light'
            : this.open.is(TokenType.Bold)
            ? 'bold'
            : 'extra';
    }

    getText() {
        return unescaped(
            this.segments.map((segment) => segment.toWordplay()).join('')
        );
    }

    containsText(text: string): boolean {
        return this.segments.some(
            (segment) => segment instanceof Words && segment.containsText(text)
        );
    }

    getGlyphs() {
        return Glyphs.Words;
    }
}
