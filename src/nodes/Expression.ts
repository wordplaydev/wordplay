import Node, { type ConflictContext } from "./Node";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "./Type";
import type Step from "src/runtime/Step";
import UnknownType from "./UnknownType";

export default abstract class Expression extends Node implements Evaluable {
    
    constructor() {
        super();
    }

    abstract computeChildren(): Node[];
    abstract getType(context: ConflictContext): Type;

    getTypeUnlessCycle(context: ConflictContext): Type {

        // If the context includes this node, we're in a cycle.
        if(context.stack.includes(this)) return new UnknownType(this);

        context.stack.push(this);
        const type = this.getType(context);
        context.stack.pop();
        return type;

    }

    abstract compile(context: ConflictContext): Step[];
    abstract evaluate(evaluator: Evaluator): Value | undefined;

}