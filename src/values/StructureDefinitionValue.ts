import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import type Evaluation from '@runtime/Evaluation';
import SimpleValue from './SimpleValue';
import type Value from '@values/Value';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locale from '@locale/Locale';
import type Concretizer from '../nodes/Concretizer';

export default class StructureDefinitionValue extends SimpleValue {
    /** The definition from the AST. */
    readonly definition: StructureDefinition;

    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | undefined;

    constructor(definition: StructureDefinition, context?: Evaluation) {
        super(definition);

        this.definition = definition;
        this.context = context;
    }

    getType() {
        return new StructureType(this.definition, []);
    }

    getBasisTypeName(): BasisTypeName {
        return 'structure';
    }

    toWordplay(locales: Locale[]) {
        return `${TYPE_SYMBOL}${this.definition.names.getPreferredNameString(
            locales
        )}`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StructureDefinitionValue &&
            this.definition === value.definition &&
            this.context === value.context
        );
    }

    getDescription(concretize: Concretizer, translation: Locale) {
        return concretize(translation, translation.term.function);
    }

    getSize() {
        return 1;
    }
}
