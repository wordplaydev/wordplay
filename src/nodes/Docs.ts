import type { Grammar, Replacement } from './Node';
import Doc from './Doc';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';
import { getPreferred } from './LanguageTagged';

export default class Docs extends Node {
    readonly docs: Doc[];

    constructor(docs: Doc[]) {
        super();

        this.docs = docs;

        this.computeChildren();
    }

    static getPossibleNodes() {
        return [new Docs([Doc.make()])];
    }

    getGrammar(): Grammar {
        return [{ name: 'docs', kind: list(false, node(Doc)) }];
    }

    clone(replace?: Replacement) {
        return new Docs(
            this.replaceChild<Doc[]>('docs', this.docs, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {
        return [];
    }

    getTags(): Doc[] {
        return this.docs;
    }

    getPreferredLocale(preferred: Locale | Locale[]): Doc {
        // Build the list of preferred languages
        const locales = Array.isArray(preferred) ? preferred : [preferred];

        return getPreferred(locales, this.docs);
    }

    getNodeLocale(locale: Locale) {
        return locale.node.Docs;
    }

    getGlyphs() {
        return Glyphs.Doc;
    }
}
