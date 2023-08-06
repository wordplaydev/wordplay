import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import Type from './Type';
import type TypeSet from './TypeSet';
import type TypeVariable from './TypeVariable';
import Glyphs from '../lore/Glyphs';
import type { Grammar } from './Node';

export default class VariableType extends Type {
    readonly definition: TypeVariable;

    constructor(definition: TypeVariable) {
        super();

        this.definition = definition;
    }

    getGrammar(): Grammar {
        return [];
    }

    computeConflicts() {}

    clone() {
        return new VariableType(this.definition) as this;
    }

    /** All types are concrete unless noted otherwise. */
    isGeneric() {
        return true;
    }

    acceptsAll(types: TypeSet) {
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

    getNodeLocale(translation: Locale) {
        return translation.node.VariableType;
    }

    getGlyphs() {
        return Glyphs.VariableType;
    }
}
