import Node from "./Node";
import Cell from "./Cell";
import type Unparsable from "./Unparsable";
import Token from "./Token";

export default class Row extends Node {

    readonly cells: Cell[];
    readonly close: Token | Unparsable;

    constructor(cells: Cell[], close: Token | Unparsable) {

        super();

        this.cells = cells;
        this.close = close;
        
    }

    computeChildren() { return [ ...this.cells, this.close ]; }
    computeConflicts() {}

    clone(original?: Node, replacement?: Node) { 
        return new Row(
            this.cells.map(c => c.cloneOrReplace([ Cell ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}