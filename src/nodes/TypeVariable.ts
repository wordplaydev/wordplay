import type { Grammar, Replacement } from './Node';
import Names from './Names';
import type Locale from '@locale/Locale';
import NameType from './NameType';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Node, { node } from './Node';

export default class TypeVariable extends Node {
    readonly names: Names;

    constructor(names: Names) {
        super();

        this.names = names;

        this.computeChildren();
    }

    getGrammar(): Grammar {
        return [{ name: 'names', kind: node(Names) }];
    }

    clone(replace?: Replacement) {
        return new TypeVariable(
            this.replaceChild('names', this.names, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Type;
    }

    simplify() {
        return new TypeVariable(this.names.simplify());
    }

    getReference(): NameType {
        return NameType.make(this.names.getNames()[0] ?? '_', this);
    }

    getNames() {
        return this.names.getNames();
    }

    hasName(name: string) {
        return this.names.hasName(name);
    }

    getPreferredName(locales: Locale | Locale[]) {
        return this.names.getPreferredNameString(locales);
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.TypeVariable;
    }

    getGlyphs() {
        return Glyphs.Name;
    }
}
