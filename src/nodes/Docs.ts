import type { Grammar, Replacement } from './Node';
import Doc from './Doc';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';

export default class Docs extends Node {
    readonly docs: Doc[];

    constructor(docs?: Doc[]) {
        super();

        this.docs = docs === undefined ? [] : docs;

        this.computeChildren();
    }

    static getPossibleNodes() {
        return [new Docs([Doc.make()])];
    }

    getGrammar(): Grammar {
        return [{ name: 'docs', kind: list(node(Doc)) }];
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

    getLocale(lang: LanguageCode | LanguageCode[]): Doc | undefined {
        lang = Array.isArray(lang) ? lang : [lang];
        // Find the doc with the most preferred language, and if there are none, an emdash.
        return (
            lang
                .map((lang) =>
                    this.docs.find((doc) => doc.getLanguage() === lang)
                )
                .filter((doc): doc is Doc => doc !== undefined)[0] ??
            this.docs[0]
        );
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Docs;
    }

    getGlyphs() {
        return Glyphs.Doc;
    }
}
