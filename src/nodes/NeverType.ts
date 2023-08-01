import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import { NEVER_SYMBOL } from '@parser/Symbols';

export default class NeverType extends Type {
    constructor() {
        super();
    }

    getGrammar() {
        return [];
    }

    acceptsAll() {
        return false;
    }
    getBasisTypeName(): BasisTypeName {
        return 'never';
    }
    computeConflicts() {}

    toWordplay() {
        return NEVER_SYMBOL;
    }

    clone() {
        return new NeverType() as this;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.NeverType;
    }

    getGlyphs() {
        return Glyphs.Never;
    }
}
