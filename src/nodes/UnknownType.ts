import type Conflict from "../parser/Conflict";
import type Node from "./Node";
import type Program from "./Program";
import Type from "./Type";

export default class UnknownType extends Type {

    readonly node: Node;

    constructor(node: Node) {
        super();

        this.node = node;

    }

    getChildren(): Node[] { return []; }
    getConflicts(program: Program): Conflict[] { return []; }
    isCompatible(program: Program, type: Type) { return false; }
    getConversion(program: Program, type: Type) { return undefined; }

}