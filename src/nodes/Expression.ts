import type { Evaluable } from "src/runtime/Evaluation";
import type Evaluator from "src/runtime/Evaluator";
import type Value from "src/runtime/Value";
import Node from "./Node";
import type Program from "./Program";
import type Type from "./Type";

export default abstract class Expression extends Node implements Evaluable {
    
    constructor() {
        super();
    }

    abstract evaluate(evaluator: Evaluator): Node | Value;
    abstract getChildren(): Node[];
    abstract getType(program: Program): Type;

}