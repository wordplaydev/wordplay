import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type { BasisTypeName } from '../basis/BasisConstants';
import Characters from '../lore/BasisCharacters';
import type { Grammar } from './Node';
import Type from './Type';
import type TypeVariable from './TypeVariable';

export default class VariableType extends Type {
    readonly definition: TypeVariable;

    constructor(definition: TypeVariable) {
        super();

        this.definition = definition;
    }

    getDescriptor(): NodeDescriptor {
        return 'VariableType';
    }

    getGrammar(): Grammar {
        return [];
    }

    computeConflicts() {
        return [];
    }

    clone() {
        return new VariableType(this.definition) as this;
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
