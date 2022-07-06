import Node from "./Node";

export default abstract class Expression extends Node {
    constructor() {
        super();
    }
    abstract getChildren(): Node[];
}