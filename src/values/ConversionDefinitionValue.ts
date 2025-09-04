import type LocaleText from '@locale/LocaleText';
import type Context from '@nodes/Context';
import type ConversionDefinition from '@nodes/ConversionDefinition';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type Evaluation from '@runtime/Evaluation';
import type { BasisTypeName } from '../basis/BasisConstants';
import Value from '../values/Value';
import SimpleValue from './SimpleValue';

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

    getDescription() {
        return (l: LocaleText) => l.term.function;
    }

    getRepresentativeText() {
        return CONVERT_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
