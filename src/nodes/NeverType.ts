import { Purpose } from '#concepts/Purpose.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { NEVER_SYMBOL } from '#parser/Symbols.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import Type from '#nodes/Type.ts';

export default class NeverType extends Type {
    constructor() {
        super();
    }

    getDescriptor(): NodeDescriptor {
        return 'NeverType';
    }

    getPurpose() {
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
        return this.cloned(new NeverType());
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NeverType;
    getLocalePath() {
        return NeverType.LocalePath;
    }

    getCharacter() {
        return Characters.Never;
    }
}
