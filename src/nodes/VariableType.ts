import { Purpose } from '#concepts/Purpose.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Characters from '../lore/BasisCharacters';
import type { Grammar } from '#nodes/Node.ts';
import Type from '#nodes/Type.ts';
import type TypeVariable from '#nodes/TypeVariable.ts';

export default class VariableType extends Type {
    readonly definition: TypeVariable;

    constructor(definition: TypeVariable) {
        super();

        this.definition = definition;
    }

    getDescriptor(): NodeDescriptor {
        return 'VariableType';
    }

    getPurpose() {
        return Purpose.Hidden;
    }

    getGrammar(): Grammar {
        return [];
    }

    computeConflicts() {
        return [];
    }

    clone() {
        return this.cloned(new VariableType(this.definition));
    }

    /** All types are concrete unless noted otherwise. */
    isGeneric() {
        return true;
    }

    acceptsAll() {
        return true;
        // return types
        //     .list()
        //     .every(
        //         (type) =>
        //             type instanceof VariableType &&
        //             type.definition == this.definition
        //     );
    }

    getBasisTypeName(): BasisTypeName {
        return 'variable';
    }

    getDefinitionOfNameInScope() {
        return undefined;
    }

    toWordplay() {
        return this.definition.toWordplay();
    }

    static readonly LocalePath = (l: LocaleText) => l.node.VariableType;
    getLocalePath() {
        return VariableType.LocalePath;
    }

    getCharacter() {
        return Characters.VariableType;
    }
}
