import type ConversionDefinition from '@nodes/ConversionDefinition';
import type Context from '@nodes/Context';
import type Evaluation from './Evaluation';
import Primitive from './Primitive';
import Value from './Value';
import { CONVERT_SYMBOL } from '@parser/Symbols';
import type { NativeTypeName } from '../native/NativeConstants';
import type Locale from '@locale/Locale';
import Description from '../locale/Description';

export default class Conversion extends Primitive {
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

    getNativeTypeName(): NativeTypeName {
        return 'conversion';
    }

    toWordplay(): string {
        return `${this.definition.input.toWordplay()}${CONVERT_SYMBOL}${this.definition.output.toWordplay()}`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof Conversion &&
            this.definition === value.definition &&
            this.context === value.context
        );
    }

    getDescription(translation: Locale) {
        return Description.as(translation.data.function);
    }

    getSize() {
        return 1;
    }
}
