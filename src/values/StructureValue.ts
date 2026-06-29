import type LocaleText from '@locale/LocaleText';
import getConceptName from '@locale/getConceptName';
import FunctionDefinition from '@nodes/FunctionDefinition';
import type Names from '@nodes/Names';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import type Type from '@nodes/Type';
import {
    BIND_SYMBOL,
    EVAL_CLOSE_SYMBOL,
    EVAL_OPEN_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';
import Evaluation, { type EvaluationNode } from '@runtime/Evaluation';
import type Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import type ConversionDefinitionValue from '@values/ConversionDefinitionValue';
import FunctionValue from '@values/FunctionValue';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import Value from '@values/Value';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Locales from '@locale/Locales';
import type Expression from '@nodes/Expression';

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
                        .join(', ')}`,
                );
            map.set(bind.names, inputs[index]);
        }

        const evaluation = new Evaluation(
            evaluator,
            creator,
            type,
            undefined,
            map,
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

        const thisBindings = this.context.getBindingsByNames();
        const thatBindings = structure.context.getBindingsByNames();

        if (thisBindings.size !== thatBindings.size) return false;

        const thatValues = [...thatBindings];

        return Array.from(thisBindings.keys()).every((key) => {
            const thisValue = thisBindings.get(key);
            const thatValue = thatValues.find(([names]) =>
                key.sharesName(names),
            );
            return (
                thisValue !== undefined &&
                thatValue !== undefined &&
                thisValue.isEqualTo(thatValue[1])
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
        // Re-bind a method to this instance so that `⬚` (This) inside the
        // method resolves to the instance it was called on, rather than the
        // scope in which the structure was constructed. Name resolution still
        // works because this StructureValue delegates to its context.
        if (value instanceof FunctionValue)
            return new FunctionValue(value.definition, this);
        if (value !== undefined) return value;
        // Fall through to static members on the definition (e.g. `m.PI` on
        // an instance of `Math`, or `someColor.red` on a `Color` instance).
        // Statics aren't bound into the instance's Evaluation (see
        // `StructureDefinition.getEvaluationSteps`), so they're reachable
        // only through the definition value. The instance's closure chain
        // contains the surrounding scope where the StructureDefinitionValue
        // was bound — try each of the structure's names (as strings, since
        // `Evaluation.resolve` only walks closures for string names).
        if (typeof name === 'string' && evaluator !== undefined) {
            for (const defName of this.type.names.getNames()) {
                const defValue = this.context.resolve(defName);
                if (defValue !== undefined && defValue !== this) {
                    const fromStatic = defValue.resolve(name, evaluator);
                    if (fromStatic !== undefined) return fromStatic;
                    break;
                }
            }
        }
        // Instance functions declared in the structure's block aren't bound
        // into the Evaluation of structures built directly via
        // `StructureValue.make` (which skips block evaluation — e.g. Color's
        // basic-color statics). Reach them through the definition, binding
        // `this` as the instance so `⬚` resolves to it.
        if (typeof name === 'string') {
            const instanceFunction = this.type.getDefinition(name);
            if (instanceFunction instanceof FunctionDefinition)
                return new FunctionValue(instanceFunction, this);
        }
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
        output: Type,
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
                }${BIND_SYMBOL} ${this.resolve(bind.getNames()[0])}`,
        );
        return `${
            locales
                ? locales.getName(this.type.names)
                : this.type.names.getNames()[0]
        }${EVAL_OPEN_SYMBOL}${bindings.join(' ')}${EVAL_CLOSE_SYMBOL}`;
    }

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'structure');
    }

    /**
     * Clone this structure, but with a new value for the given property.
     * If the property doesn't exist, then return undefined.
     */
    withValue(
        creator: EvaluationNode,
        property: string,
        value: Value,
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
    values: Map<Names, Value>,
): StructureValue {
    return new StructureValue(
        definition,
        new Evaluation(
            evaluator,
            evaluator.getMain(),
            definition,
            undefined,
            values,
        ),
    );
}
