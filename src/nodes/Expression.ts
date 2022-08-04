import Node, { type ConflictContext } from "./Node";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Type from "./Type";
import type Step from "src/runtime/Step";

export default abstract class Expression extends Node implements Evaluable {
    
    constructor() {
        super();
    }

    abstract getChildren(): Node[];
    abstract getType(context: ConflictContext): Type;
    abstract compile(context: ConflictContext): Step[];
    abstract evaluate(evaluator: Evaluator): Value | undefined;

}