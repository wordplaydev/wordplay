import type { BasisTypeName } from '../basis/BasisConstants';
import Type from './Type';
import Glyphs from '../lore/Glyphs';
import { NEVER_SYMBOL } from '@parser/Symbols';
import type Locales from '../locale/Locales';

export default class NeverType extends Type {
    constructor() {
        super();
    }

    getDescriptor() {
        return 'NeverType';
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
    computeConflicts() {
        return;
    }

    toWordplay() {
        return NEVER_SYMBOL;
    }

    clone() {
        return new NeverType() as this;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.NeverType);
    }

    getGlyphs() {
        return Glyphs.Never;
    }
}
