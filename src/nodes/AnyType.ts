import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';
import Type from './Type';

export default class AnyType extends Type {
    constructor() {
        super();
    }

    getDescriptor(): NodeDescriptor {
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
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.AnyType;
    getLocalePath() {
        return AnyType.LocalePath;
    }

    toWordplay() {
        return PLACEHOLDER_SYMBOL;
    }

    clone() {
        return this;
    }

    getCharacter() {
        return Characters.Placeholder;
    }
}
