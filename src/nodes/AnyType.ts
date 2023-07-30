import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';

export default class AnyType extends Type {
    constructor() {
        super();
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

    computeConflicts() {}

    getNodeLocale(translation: Locale) {
        return translation.node.AnyType;
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
