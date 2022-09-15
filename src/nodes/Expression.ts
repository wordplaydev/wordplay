import Node, { type ConflictContext } from "./Node";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "./Type";
import type Step from "src/runtime/Step";
import UnknownType from "./UnknownType";

export default abstract class Expression extends Node implements Evaluable {

    /** A cache of the type computed for this epxression. Undefined means its not computed. */
    _type: Type | undefined = undefined;
    
    constructor() {
        super();
    }

    abstract computeChildren(): Node[];
    abstract computeType(context: ConflictContext): Type;

    getType(context: ConflictContext) {
        if(this._type === undefined)
            this._type = this.computeType(context);
        return this._type;
    }


    getTypeUnlessCycle(context: ConflictContext): Type {

        // If the context includes this node, we're in a cycle.
        if(context.visited(this)) return new UnknownType(this);

        context.visit(this);
        const type = this.getType(context);
        context.unvisit();
        return type;

    }

    abstract compile(context: ConflictContext): Step[];
    abstract evaluate(evaluator: Evaluator): Value | undefined;

}