import Node from "./Node";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "src/runtime/Value";
import type Program from "./Program";
import type Type from "./Type";
import type Step from "src/runtime/Step";
import type Evaluation from "../runtime/Evaluation";

export default abstract class Expression extends Node implements Evaluable {
    
    constructor() {
        super();
    }

    abstract getChildren(): Node[];
    abstract getType(program: Program): Type;
    abstract compile(): Step[];
    abstract evaluate(evaluator: Evaluator): Value | undefined;

}