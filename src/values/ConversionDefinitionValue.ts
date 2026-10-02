import type LocaleText from '#locale/LocaleText.ts';
import getConceptName from '#locale/getConceptName.ts';
import type Context from '#nodes/Context.ts';
import type ConversionDefinition from '#nodes/ConversionDefinition.ts';
import { CONVERT_SYMBOL } from '#parser/Symbols.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import type { BasisTypeName } from '#basis/BasisConstants.ts';
import Value from '#values/Value.ts';
import SimpleValue from '#values/SimpleValue.ts';

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
        return (l: LocaleText) => getConceptName(l, 'function');
    }

    getRepresentativeText() {
        return CONVERT_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
