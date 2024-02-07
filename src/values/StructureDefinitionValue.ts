import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import type Evaluation from '@runtime/Evaluation';
import SimpleValue from './SimpleValue';
import type Value from '@values/Value';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

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

    toWordplay(locales?: Locales) {
        return `${TYPE_SYMBOL}${
            locales
                ? locales.getName(this.definition.names)
                : this.definition.getNames()[0]
        }`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof StructureDefinitionValue &&
            this.definition === value.definition &&
            this.context === value.context
        );
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.function)
        );
    }

    getRepresentativeText(locales: Locales) {
        return (
            TYPE_SYMBOL + this.definition.getPreferredName(locales.getLocales())
        );
    }

    getSize() {
        return 1;
    }
}
