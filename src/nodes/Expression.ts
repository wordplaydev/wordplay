import Node from "./Node";
import type Program from "./Program";
import type Type from "./Type";

export default abstract class Expression extends Node {
    
    constructor() {
        super();
    }
    
    abstract getChildren(): Node[];
    abstract getType(program: Program): Type;

}