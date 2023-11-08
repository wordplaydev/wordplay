import type { Grammar, Replacement } from './Node';
import Doc from './Doc';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';
import { getPreferred } from './LanguageTagged';
import type Locales from '../locale/Locales';

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

    getDescriptor() {
        return 'Docs';
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

    getPreferredLocale(preferred: Locales): Doc {
        // Build the list of preferred languages
        const locales = preferred.getLocales();

        return getPreferred(locales, this.docs);
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Docs);
    }

    getGlyphs() {
        return Glyphs.Doc;
    }
}
