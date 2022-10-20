import Node from "./Node";
import Cell from "./Cell";
import type Unparsable from "./Unparsable";
import Token from "./Token";
import Bind from "./Bind";
import Expression from "./Expression";

export default class Row extends Node {

    readonly cells: Cell[];
    readonly close: Token | Unparsable;

    constructor(cells: Cell[], close: Token | Unparsable) {

        super();

        this.cells = cells;
        this.close = close;
        
    }

    allBinds() { return this.cells.every(cell => cell.value instanceof Bind ); }
    allExpressions() { return this.cells.every(cell => cell.value instanceof Expression ); }

    computeChildren() { return [ ...this.cells, this.close ]; }
    computeConflicts() {}

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */ 
    isBindingEnclosureOfChild(child: Node): boolean { return this.cells.includes(child as Cell); }

    clone(original?: Node | string, replacement?: Node) { 
        return new Row(
            this.cloneOrReplaceChild([ Cell ], "cells", this.cells, original, replacement),
            this.cloneOrReplaceChild([ Token ], "close", this.close, original, replacement)
        ) as this; 
    }

    getDescriptions() {
        return {
            eng: "A table row"
        }
    }

    getReplacementChild() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

}