import type StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import Unparsable from "../nodes/Unparsable";
import type Conversion from "./Conversion";
import Evaluation from "./Evaluation";
import Value from "./Value";

export default class Structure extends Value {

    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(context: Evaluation) {
        super();

        this.type = context.getDefinition() as StructureDefinition;
        this.context = context;

    }

    getType() { return this.type; }

    resolve(name: string) {
        return this.context.resolve(name);
    }

    getConversion(type: Type): Conversion | undefined {
        return this.context.getConversion(type);
    }

    toString(): string {
        return `(${this.type.inputs.map(bind => {
            
            if(bind instanceof Unparsable) return "";
            
            const name = bind.names[0].getName();
            const value = this.resolve(name);
            return value === undefined ? "" : `${name}: ${value}`;
        
        }).join(" ")})`;
    }


}

export function createStructure(definition: StructureDefinition, values: Record<string, Value>): Structure {

    const bindings = new Map<string,Value>();
    Object.keys(values).forEach(key => bindings.set(key, values[key]));
    return new Structure(new Evaluation(definition, undefined, undefined, bindings));

}