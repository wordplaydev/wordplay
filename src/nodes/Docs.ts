import type { InsertContext, ReplaceContext } from '@edit/EditContext';
import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
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

    static getTemplate(locales: Locales) {
        return Docs.make([Doc.getTemplate(locales)]);
    }

    static getPossibleReplacements({ locales }: ReplaceContext) {
        return Docs.getTemplate(locales);
    }

    static getPossibleInsertions({ locales }: InsertContext) {
        return Docs.getTemplate(locales);
    }

    static make(docs?: Doc[]) {
        return new Docs(docs ?? []);
    }

    getDescriptor(): NodeDescriptor {
        return 'Docs';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'docs',
                kind: list(true, node(Doc)),
                newline: true,
                label: () => (l) => l.term.documentation,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Docs(
            this.replaceChild<Doc[]>('docs', this.docs, replace),
        ) as this;
    }

    isEmpty() {
        return this.docs.length === 0;
    }

    withOption(doc: Doc) {
        return new Docs([...this.docs, doc]);
    }

    getPurpose() {
        return Purpose.Documentation;
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

    static readonly LocalePath = (l: LocaleText) => l.node.Docs;
    getLocalePath() {
        return Docs.LocalePath;
    }

    getCharacter() {
        return Characters.Doc;
    }
}
