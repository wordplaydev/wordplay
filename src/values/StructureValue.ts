import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import type Type from '@nodes/Type';
import type ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import Evaluation, { type EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import FunctionValue from '@values/FunctionValue';
import Value from '@values/Value';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import BoolValue from '@values/BoolValue';
import type Names from '@nodes/Names';
import {
    BIND_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export default class StructureValue extends Value {
    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(creator: Expression, context: Evaluation) {
        super(creator);

        this.type = context.getDefinition() as StructureDefinition;
        this.context = context;
    }

    /** Creates an evaluation with the inputs of the given type */
    static make(
        evaluator: Evaluator,
        creator: EvaluationNode,
        type: StructureDefinition,
        ...inputs: Value[]
    ) {
        const map = new Map<Names, Value>();
        for (let index = 0; index < type.inputs.length; index++) {
            const bind = type.inputs[index];
            const input = inputs[index];
            if (input === undefined)
                throw new Error(
                    `Inputs are missing input # ${index}, ${type.inputs[index]
                        .getNames()
                        .join(', ')}`
                );
            map.set(bind.names, inputs[index]);
        }

        const evaluation = new Evaluation(
            evaluator,
            creator,
            type,
            undefined,
            map
        );

        const structure = new StructureValue(creator, evaluation);

        return structure;
    }

    /**
     * A structure is equal to another structure if all of its bindings are equal and they have the same definition.
     */
    isEqualTo(structure: Value): boolean {
        if (
            !(structure instanceof StructureValue) ||
            !this.type.isEqualTo(structure.type)
        )
            return false;

        const thisBindings = this.context.getBindings();
        const thatBindings = structure.context.getBindings();

        if (thisBindings[0].size !== thatBindings[0].size) return false;

        return Array.from(thisBindings[0].keys()).every((key) => {
            const thisKey = typeof key === 'string' ? key : key.getNames()[0];
            const thisValue = thisBindings[0].get(thisKey);
            const thatValue = thatBindings[0].get(thisKey);
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
        return new StructureType(this.type, []);
    }

    getBasisTypeName(): BasisTypeName {
        return 'structure';
    }

    getInput(number: number): Value | undefined {
        const names = this.type.inputs[number].names;
        return names ? this.resolve(names) : undefined;
    }

    resolve(name: string | Names, evaluator?: Evaluator): Value | undefined {
        const value = this.context.resolve(name);
        if (value !== undefined) return value;
        const basisFun =
            evaluator && typeof name === 'string'
                ? evaluator
                      .getBasis()
                      .getFunction(this.getBasisTypeName(), name)
                : undefined;
        return basisFun === undefined
            ? undefined
            : new FunctionValue(basisFun, this);
    }

    getNumber(name: string | number): number | undefined {
        const measurement =
            typeof name === 'number' ? this.getInput(name) : this.resolve(name);
        if (measurement instanceof NumberValue) return measurement.toNumber();
        return undefined;
    }

    getBool(name: string | number): boolean | undefined {
        const bool =
            typeof name === 'number' ? this.getInput(name) : this.resolve(name);
        if (bool instanceof BoolValue) return bool.bool;
        return undefined;
    }

    getText(name: string): string | undefined {
        const text =
            typeof name === 'number' ? this.getInput(name) : this.resolve(name);
        if (text instanceof TextValue) return text.text.toString();
        return undefined;
    }

    getConversion(
        input: Type,
        output: Type
    ): ConversionDefinitionValue | undefined {
        return this.context.getConversion(input, output);
    }

    toWordplay(locales?: Locales): string {
        const bindings = this.type.inputs.map(
            (bind) =>
                `${
                    locales
                        ? locales.getName(bind.names)
                        : bind.names.getNames()[0]
                }${BIND_SYMBOL} ${this.resolve(bind.getNames()[0])}`
        );
        return `${
            locales
                ? locales.getName(this.type.names)
                : this.type.names.getNames()[0]
        }${EVAL_OPEN_SYMBOL}${bindings.join(' ')}${EVAL_CLOSE_SYMBOL}`;
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.structure)
        );
    }

    /**
     * Clone this structure, but with a new value for the given property.
     * If the property doesn't exist, then return undefined.
     */
    withValue(
        creator: EvaluationNode,
        property: string,
        value: Value
    ): StructureValue | undefined {
        const newContext = this.context.withValue(creator, property, value);
        return newContext ? new StructureValue(creator, newContext) : undefined;
    }

    getRepresentativeText() {
        return TYPE_SYMBOL;
    }

    getSize() {
        return this.context.getSize();
    }
}

export function createStructure(
    evaluator: Evaluator,
    definition: StructureDefinition,
    values: Map<Names, Value>
): StructureValue {
    return new StructureValue(
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
