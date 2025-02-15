import type { NodeDescriptor } from '@locale/NodeTexts';
import { NEVER_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import Type from './Type';

export default class NeverType extends Type {
    constructor() {
        super();
    }

    getDescriptor(): NodeDescriptor {
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
        return [];
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

    getCharacter() {
        return Characters.Never;
    }
}
