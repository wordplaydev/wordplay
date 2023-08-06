import type { BasisTypeName } from '../basis/BasisConstants';
import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import { FUNCTION_SYMBOL } from '@parser/Symbols';
import type Evaluation from '@runtime/Evaluation';
import Value from '@values/Value';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

// We could have just called this Function, but Javascript claims that globally.
export default class FunctionValue extends Value {
    /** The definition from the AST. */
    readonly definition: FunctionDefinition;

    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | Value | undefined;

    constructor(
        definition: FunctionDefinition,
        context: Evaluation | Value | undefined
    ) {
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
        return 'function';
    }

    resolve() {
        return undefined;
    }

    toWordplay(locales: Locale[]) {
        return `${FUNCTION_SYMBOL} ${this.definition.names.getPreferredNameString(
            locales
        )}()`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof FunctionValue &&
            this.definition === value.definition
        );
    }

    getDescription(locale: Locale) {
        return concretize(locale, locale.term.function);
    }

    getSize() {
        return 1;
    }
}