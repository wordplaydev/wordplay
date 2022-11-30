import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType, { STRUCTURE_NATIVE_TYPE_NAME } from "../nodes/StructureType";
import type Type from "../nodes/Type";
import type Conversion from "./Conversion";
import Evaluation from "./Evaluation";
import type Evaluator from "./Evaluator";
import FunctionValue from "./FunctionValue";
import Value from "./Value";
import type Node from "../nodes/Node";
import Measurement from "./Measurement";
import Text from "./Text";
import Bool from "./Bool";
import type Names from "../nodes/Names";

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
    
        if(!(structure instanceof Structure) || this.type !== structure.type) return false;

        const thisBindings = this.context.getBindings();
        const thatBindings = this.context.getBindings();

        if(thisBindings.size !== thatBindings.size) return false;

        return Array.from(thisBindings.keys()).every(key => {
            const thisValue = thisBindings.get(key);
            const thatValue = thatBindings.get(key);
            return thisValue !== undefined && thatValue !== undefined && thisValue.isEqualTo(thatValue);
        })
    }

    getType() { return new StructureType(this.type); }

    getNativeTypeName(): string { return STRUCTURE_NATIVE_TYPE_NAME; }

    resolve(name: string, evaluator?: Evaluator): Value | undefined {
        const value = this.context.resolve(name);
        if(value !== undefined) return value;
        const nativeFun = evaluator?.getNative().getFunction(this.getNativeTypeName(), name);
        return nativeFun === undefined ? undefined : new FunctionValue(nativeFun, this);
    }

    getMeasurement(name: string): number | undefined {
        const measurement = this.resolve(name);
        if(measurement instanceof Measurement)
            return measurement.toNumber();
        return undefined;
    }

    getBool(name: string): boolean | undefined {
        const bool = this.resolve(name);
        if(bool instanceof Bool)
            return bool.bool;
        return undefined;
    }

    getText(name: string): string | undefined {
        const text = this.resolve(name);
        if(text instanceof Text)
            return text.text.toString();
        return undefined;
    }

    getConversion(input: Type, output: Type): Conversion | undefined {
        return this.context.getConversion(input, output);
    }

    toString(): string {
        return `${this.type.names.names[0].getName()}(${this.type.inputs.map(bind => {            
            const name = bind.names.names[0].getName();
            const value = name == undefined ? undefined : this.resolve(name);
            return value === undefined ? "" : `${name}: ${value}`;
        }).join(" ")})`;
    }


}

export function createStructure(evaluator: Evaluator, definition: StructureDefinition, values: Map<Names, Value>): Structure {

    return new Structure(definition, new Evaluation(evaluator, evaluator.getProgram(), definition, definition, undefined, values));

}