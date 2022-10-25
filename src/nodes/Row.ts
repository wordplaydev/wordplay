import Node from "./Node";
import Cell from "./Cell";
import type Unparsable from "./Unparsable";
import Token from "./Token";
import Bind from "./Bind";
import Expression from "./Expression";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

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

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new Row(
            this.cloneOrReplaceChild(pretty, [ Cell ], "cells", this.cells, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "close", this.close, original, replacement)
        ) as this; 
    }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A table row"
        }
    }

}