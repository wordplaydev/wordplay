import type LocaleText from '#locale/LocaleText.ts';
import getConceptName from '#locale/getConceptName.ts';
import type Context from '#nodes/Context.ts';
import type FunctionDefinition from '#nodes/FunctionDefinition.ts';
import { FUNCTION_SYMBOL } from '#parser/Symbols.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Value from '#values/Value.ts';
import {
    StructureTypeName,
    type BasisTypeName,
} from '#basis/BasisConstants.ts';
import type Locales from '#locale/Locales.ts';

// We could have just called this Function, but Javascript claims that globally.
export default class FunctionValue extends Value {
    /** The definition from the AST. */
    readonly definition: FunctionDefinition;

    /** The evaluation context in which this function was created. This enables closures. */
    readonly context: Evaluation | Value | undefined;

    constructor(
        definition: FunctionDefinition,
        context: Evaluation | Value | undefined,
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

    /** Reach the universal `=`/`≠` the way every other value does. Inlined rather than
     *  inherited from `SimpleValue`, which imports `FunctionValue` to build the bound
     *  function it returns — extending it here would be an import cycle. */
    resolve(name: string, evaluator?: Evaluator): Value | undefined {
        const fun = evaluator?.getBasis().getFunction(StructureTypeName, name);
        return fun === undefined ? undefined : new FunctionValue(fun, this);
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

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'function');
    }

    getRepresentativeText() {
        return FUNCTION_SYMBOL;
    }

    getSize() {
        return 1;
    }
}
