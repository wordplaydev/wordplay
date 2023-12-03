import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Context from '@nodes/Context';
import type Evaluation from '@runtime/Evaluation';
import SimpleValue from './SimpleValue';
import Value from '../values/Value';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default class ConversionDefinitionValue extends SimpleValue {
    /** The definition from the AST. */
    readonly definition: ConversionDefinition;

    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | Value;

    constructor(definition: ConversionDefinition, context: Evaluation | Value) {
        super(definition);

        this.definition = definition;
        this.context = context;
    }

    getType(context: Context) {
        return this.context instanceof Value
            ? this.context.getType(context)
            : this.definition.getType(context);
    }

    getBasisTypeName(): BasisTypeName {
        return 'conversion';
    }

    toWordplay(): string {
        return `${this.definition.input.toWordplay()}${CONVERT_SYMBOL}${this.definition.output.toWordplay()}`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof ConversionDefinitionValue &&
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

    getRepresentativeText() {
        return CONVERT_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
