import type { BasisTypeName } from '../basis/BasisConstants';
import Type from './Type';
import type TypeVariable from './TypeVariable';
import Characters from '../lore/BasisCharacters';
import type { Grammar } from './Node';
import type Locales from '../locale/Locales';
import type { NodeDescriptor } from '@locale/NodeTexts';

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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.VariableType);
    }

    getCharacter() {
        return Characters.VariableType;
    }
}
