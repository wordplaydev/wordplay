import Node, { type ConflictContext } from "./Node";
import type Cell from "./Cell";
import type Program from "./Program";
import type Conflict from "../parser/Conflict";

export default class Row extends Node {

    readonly cells: Cell[];

    constructor(cells: Cell[]) {

        super();

        this.cells = cells;
        
    }

    getChildren() {
        return [ ...this.cells ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

}