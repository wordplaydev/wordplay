import { Purpose } from '#concepts/Purpose.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import { PLACEHOLDER_SYMBOL } from '#parser/Symbols.ts';
import Type from '#nodes/Type.ts';

export default class AnyType extends Type {
    constructor() {
        super();
    }

    getDescriptor(): NodeDescriptor {
        return 'AnyType';
    }

    getPurpose() {
        return Purpose.Hidden;
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
