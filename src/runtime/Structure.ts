import type StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import type Conversion from "./Conversion";
import type Evaluation from "./Evaluation";
import Value from "./Value";

export default class Structure extends Value {

    readonly type: StructureDefinition;
    readonly context: Evaluation;

    constructor(context: Evaluation) {
        super();

        this.type = context.getNode() as StructureDefinition;
        this.context = context;

    }

    resolve(name: string) {
        return this.context.resolve(name);
    }

    getConversion(type: Type): Conversion | undefined {
        return this.context.getConversion(type);
    }

    toString(): string {
        // TODO We can do better than this...
        return this.context.getDefinition().toWordplay();
    }


}