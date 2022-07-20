import type StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import Unparsable from "../nodes/Unparsable";
import type Conversion from "./Conversion";
import type Evaluation from "./Evaluation";
import Value from "./Value";

export default class Structure extends Value {

    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(context: Evaluation) {
        super();

        this.type = context.getDefinition() as StructureDefinition;
        this.context = context;

    }

    resolve(name: string) {
        return this.context.resolve(name);
    }

    getConversion(type: Type): Conversion | undefined {
        return this.context.getConversion(type);
    }

    toString(): string {
        return `(${this.type.inputs.map(bind => {
            
            if(bind instanceof Unparsable) return "";
            
            const name = bind.names[0].name.text;
            const value = this.resolve(name);
            return value === undefined ? "" : `${name}: ${value}`;
        
        }).join(" ")})`;
    }


}