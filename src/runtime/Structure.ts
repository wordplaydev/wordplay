import type StructureDefinition from "../nodes/StructureDefinition";
import StructureType, { STRUCTURE_NATIVE_TYPE_NAME } from "../nodes/StructureType";
import type Type from "../nodes/Type";
import Unparsable from "../nodes/Unparsable";
import type Conversion from "./Conversion";
import Evaluation from "./Evaluation";
import type Evaluator from "./Evaluator";
import FunctionValue from "./FunctionValue";
import Value from "./Value";

export default class Structure extends Value {

    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(context: Evaluation) {
        super();

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
        const fun = this.context.resolve(name);
        if(fun !== undefined) return fun;
        const nativeFun = evaluator?.getNative().getFunction(this.getNativeTypeName(), name);
        return nativeFun === undefined ? undefined : new FunctionValue(nativeFun, this);
    }

    getConversion(input: Type, output: Type): Conversion | undefined {
        return this.context.getConversion(input, output);
    }

    toString(): string {
        return `${this.type.aliases[0].getName()}(${this.type.inputs.map(bind => {
            
            if(bind instanceof Unparsable) return "";
            
            const name = bind.aliases[0].getName();
            const value = name == undefined ? undefined : this.resolve(name);
            return value === undefined ? "" : `${name}: ${value}`;
        
        }).join(" ")})`;
    }


}

export function createStructure(evaluator: Evaluator, definition: StructureDefinition, values: Record<string, Value>): Structure {

    const bindings = new Map<string,Value>();
    Object.keys(values).forEach(key => bindings.set(key, values[key]));
    return new Structure(new Evaluation(evaluator, definition, definition, undefined, bindings));

}