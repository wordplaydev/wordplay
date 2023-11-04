import type { BasisTypeName } from '../basis/BasisConstants';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';
import type Locales from '../locale/Locales';

export default class AnyType extends Type {
    constructor() {
        super();
    }

    getDescriptor() {
        return 'AnyType';
    }

    getGrammar() {
        return [];
    }

    acceptsAll() {
        return true;
    }

    getBasisTypeName(): BasisTypeName {
        return 'any';
    }

    computeConflicts() {
        return;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.AnyType);
    }

    toWordplay() {
        return PLACEHOLDER_SYMBOL;
    }

    clone() {
        return this;
    }

    getGlyphs() {
        return Glyphs.Placeholder;
    }
}
