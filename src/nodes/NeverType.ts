import Purpose from '@concepts/Purpose';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { NEVER_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import Type from './Type';

export default class NeverType extends Type {
    constructor() {
        super();
    }

    getDescriptor(): NodeDescriptor {
        return 'NeverType';
    }

    getPurpose(): Purpose {
        return Purpose.Hidden;
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

    static readonly LocalePath = (l: LocaleText) => l.node.NeverType;
    getLocalePath() {
        return NeverType.LocalePath;
    }

    getCharacter() {
        return Characters.Never;
    }
}
