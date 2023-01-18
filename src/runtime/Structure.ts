import type StructureDefinition from '../nodes/StructureDefinition';
import StructureDefinitionType from '../nodes/StructureDefinitionType';
import type Type from '../nodes/Type';
import type Conversion from './Conversion';
import Evaluation from './Evaluation';
import type Evaluator from './Evaluator';
import FunctionValue from './FunctionValue';
import Value from './Value';
import type Node from '../nodes/Node';
import Measurement from './Measurement';
import Text from './Text';
import Bool from './Bool';
import type Names from '../nodes/Names';
import type LanguageCode from '../translation/LanguageCode';
import {
    BIND_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
} from '../parser/Symbols';
import type { NativeTypeName } from '../native/NativeConstants';
import type Translation from '../translation/Translation';

export default class Structure extends Value {
    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(creator: Node, context: Evaluation) {
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

    getMeasurement(name: string): number | undefined {
        const measurement = this.resolve(name);
        if (measurement instanceof Measurement) return measurement.toNumber();
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
                `${bind.names.getTranslation(
                    languages
                )}${BIND_SYMBOL} ${this.resolve(bind.getNames()[0])}`
        );
        return `${this.type.names.getTranslation(
            languages
        )}${EVAL_OPEN_SYMBOL}${bindings.join(' ')}${EVAL_CLOSE_SYMBOL}`;
    }

    getDescription(translation: Translation) {
        return translation.data.structure;
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
