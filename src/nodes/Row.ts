import Node from "./Node";
import Cell from "./Cell";
import Unparsable from "./Unparsable";
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
        
        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "cells", types:[[ Cell ]] },
            { name: "close", types:[ Token, Unparsable ] },
        ]; 
    }

    allBinds() { return this.cells.every(cell => cell.value instanceof Bind ); }
    allExpressions() { return this.cells.every(cell => cell.value instanceof Expression ); }

    computeConflicts() {}

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */ 
    isBindingEnclosureOfChild(child: Node): boolean { return this.cells.includes(child as Cell); }

    clone(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Row(
            this.cloneOrReplaceChild(pretty, "cells", this.cells, original, replacement),
            this.cloneOrReplaceChild(pretty, "close", this.close, original, replacement)
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