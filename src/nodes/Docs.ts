import type LanguageCode from '@locale/LanguageCode';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Doc from './Doc';
import { getPreferred } from './LanguageTagged';
import type { Grammar, Replacement } from './Node';
import Node, { list, node } from './Node';

export default class Docs extends Node {
    readonly docs: Doc[];

    constructor(docs: Doc[]) {
        super();

        this.docs = docs;

        this.computeChildren();
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleAppends() {
        return [new Docs([Doc.make()])];
    }

    getDescriptor(): NodeDescriptor {
        return 'Docs';
    }

    getGrammar(): Grammar {
        return [{ name: 'docs', kind: list(false, node(Doc)), newline: true }];
    }

    clone(replace?: Replacement) {
        return new Docs(
            this.replaceChild<Doc[]>('docs', this.docs, replace),
        ) as this;
    }

    withOption(doc: Doc) {
        return new Docs([...this.docs, doc]);
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {
        return [];
    }

    getTagged(): Doc[] {
        return this.docs;
    }

    getOptions() {
        return this.docs;
    }

    containsLanguage(lang: LanguageCode) {
        return this.docs.some((doc) => doc.isLanguage(lang));
    }

    getLanguage(lang: LanguageCode) {
        return this.docs.find((doc) => doc.isLanguage(lang));
    }

    getPreferredLocale(preferred: Locales): Doc {
        // Build the list of preferred languages
        const locales = preferred.getLocales();

        return getPreferred(locales, this.docs);
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Docs);
    }

    getCharacter() {
        return Characters.Doc;
    }
}
