import type { BasisTypeName } from '../basis/BasisConstants';
import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import { FUNCTION_SYMBOL } from '@parser/Symbols';
import type Evaluation from '@runtime/Evaluation';
import Value from '@values/Value';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

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

    toWordplay(locales?: Locales) {
        return `${FUNCTION_SYMBOL} ${
            locales
                ? locales.getName(this.definition.names)
                : this.definition.names.getNames()[0]
        }()`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof FunctionValue &&
            this.definition === value.definition
        );
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.function)
        );
    }

    getRepresentativeText() {
        return FUNCTION_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
