import Node, { type Replacement } from './Node';
import type Locale from '@locale/Locale';
import Paragraph from './Paragraph';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';

export default class Markup extends Node {
    readonly paragraphs: Paragraph[];

    constructor(content: Paragraph[]) {
        super();

        this.paragraphs = content;

        this.computeChildren();
    }

    static make(content: Paragraph[]) {
        return new Markup(content);
    }

    getGrammar() {
        return [{ name: 'paragraphs', types: [[Paragraph]] }];
    }

    clone(replace?: Replacement) {
        return new Markup(
            this.replaceChild('paragraphs', this.paragraphs, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.Markup;
    }

    getGlyphs() {
        return Glyphs.Markup;
    }

    getDescriptionInputs() {
        return [this.paragraphs.length];
    }
}
