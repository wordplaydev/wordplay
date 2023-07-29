import type { Grammar, Replacement } from './Node';
import Doc from './Doc';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { list, node } from './Node';
import Literal from './Literal';
import type Value from '../runtime/Value';
import type Bind from './Bind';
import type Type from './Type';
import type TypeSet from './TypeSet';
import concretize from '../locale/concretize';
import DocsValue from '../runtime/DocsValue';
import DocsType from './DocsType';

export default class Docs extends Literal {
    readonly docs: [Doc, ...Doc[]];

    constructor(docs: [Doc, ...Doc[]]) {
        super();

        this.docs = docs;

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
            this.replaceChild<[Doc, ...Doc[]]>('docs', this.docs, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Document;
    }

    computeConflicts() {
        return [];
    }

    getLocale(lang: LanguageCode | LanguageCode[]): Doc {
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

    getNodeLocale(locale: Locale) {
        return locale.node.Docs;
    }

    getGlyphs() {
        return Glyphs.Doc;
    }

    getValue(): Value {
        return new DocsValue(this);
    }

    computeType(): Type {
        return DocsType.make();
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet): TypeSet {
        return current;
    }

    getStart(): Node {
        return this.docs[0];
    }

    getFinish(): Node {
        throw this.docs[this.docs.length - 1];
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.Docs.start);
    }
}
