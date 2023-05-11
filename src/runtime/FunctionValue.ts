import type { NativeTypeName } from '../native/NativeConstants';
import type Context from '@nodes/Context';
import type FunctionDefinition from '@nodes/FunctionDefinition';
import type LanguageCode from '@translation/LanguageCode';
import { FUNCTION_SYMBOL } from '@parser/Symbols';
import type Evaluation from './Evaluation';
import Value from './Value';
import type Locale from '@translation/Locale';

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

    getNativeTypeName(): NativeTypeName {
        return 'function';
    }

    resolve() {
        return undefined;
    }

    toWordplay(languages: LanguageCode[]) {
        return `${FUNCTION_SYMBOL} ${this.definition.names.getLocaleText(
            languages
        )}()`;
    }

    isEqualTo(value: Value): boolean {
        return (
            value instanceof FunctionValue &&
            this.definition === value.definition &&
            this.context === value.context
        );
    }

    getDescription(translation: Locale) {
        return translation.data.function;
    }

    getSize() {
        return 1;
    }
}
