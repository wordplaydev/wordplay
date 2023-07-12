import type StructureDefinition from '@nodes/StructureDefinition';
import StructureDefinitionType from '@nodes/StructureDefinitionType';
import type Type from '@nodes/Type';
import type Conversion from './Conversion';
import Evaluation, { type EvaluatorNode } from './Evaluation';
import type Evaluator from './Evaluator';
import FunctionValue from './FunctionValue';
import Value from './Value';
import Number from './Number';
import Text from './Text';
import Bool from './Bool';
import type Names from '@nodes/Names';
import type LanguageCode from '@locale/LanguageCode';
import {
    BIND_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
} from '@parser/Symbols';
import type { NativeTypeName } from '../native/NativeConstants';
import type Locale from '@locale/Locale';
import type Expression from '../nodes/Expression';
import concretize from '../locale/concretize';

export default class Structure extends Value {
    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(creator: Expression, context: Evaluation) {
        super(creator);

        this.type = context.getDefinition() as StructureDefinition;
        this.context = context;
    }

    /**
     * A structure is equal to another structure if all of its bindings are equal and they have the same definition.
     */
    isEqualTo(structure: Value): boolean {
        if (!(structure instanceof Structure) || this.type !== structure.type)
            return false;

        const thisBindings = this.context.getBindings();
        const thatBindings = this.context.getBindings();

        if (thisBindings.size !== thatBindings.size) return false;

        return Array.from(thisBindings.keys()).every((key) => {
            const thisValue = thisBindings.get(key);
            const thatValue = thatBindings.get(key);
            return (
                thisValue !== undefined &&
                thatValue !== undefined &&
                thisValue.isEqualTo(thatValue)
            );
        });
    }

    is(type: StructureDefinition) {
        return this.type === type;
    }

    getType() {
        return new StructureDefinitionType(this.type, []);
    }

    getNativeTypeName(): NativeTypeName {
        return 'structure';
    }

    resolve(name: string, evaluator?: Evaluator): Value | undefined {
        const value = this.context.resolve(name);
        if (value !== undefined) return value;
        const nativeFun = evaluator
            ?.getNative()
            .getFunction(this.getNativeTypeName(), name);
        return nativeFun === undefined
            ? undefined
            : new FunctionValue(nativeFun, this);
    }

    getNumber(name: string): number | undefined {
        const measurement = this.resolve(name);
        if (measurement instanceof Number) return measurement.toNumber();
        return undefined;
    }

    getBool(name: string): boolean | undefined {
        const bool = this.resolve(name);
        if (bool instanceof Bool) return bool.bool;
        return undefined;
    }

    getText(name: string): string | undefined {
        const text = this.resolve(name);
        if (text instanceof Text) return text.text.toString();
        return undefined;
    }

    getConversion(input: Type, output: Type): Conversion | undefined {
        return this.context.getConversion(input, output);
    }

    toWordplay(languages: LanguageCode[]): string {
        const bindings = this.type.inputs.map(
            (bind) =>
                `${bind.names.getLocaleText(
                    languages
                )}${BIND_SYMBOL} ${this.resolve(bind.getNames()[0])}`
        );
        return `${this.type.names.getLocaleText(
            languages
        )}${EVAL_OPEN_SYMBOL}${bindings.join(' ')}${EVAL_CLOSE_SYMBOL}`;
    }

    getDescription(locale: Locale) {
        return concretize(locale, locale.term.structure);
    }

    /**
     * Clone this structure, but with a new value for the given property.
     * If the property doesn't exist, then return undefined.
     */
    withValue(
        creator: EvaluatorNode,
        property: string,
        value: Value
    ): Structure | undefined {
        const newContext = this.context.withValue(creator, property, value);
        return newContext ? new Structure(creator, newContext) : undefined;
    }

    getSize() {
        return this.context.getSize();
    }
}

export function createStructure(
    evaluator: Evaluator,
    definition: StructureDefinition,
    values: Map<Names, Value>
): Structure {
    return new Structure(
        definition,
        new Evaluation(
            evaluator,
            evaluator.getMain(),
            definition,
            undefined,
            values
        )
    );
}
