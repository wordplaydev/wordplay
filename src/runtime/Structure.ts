import type StructureDefinition from "../nodes/StructureDefinition";
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

    toString(): string {
        // TODO We can do better than this...
        return this.context.getDefinition().toWordplay();
    }


}