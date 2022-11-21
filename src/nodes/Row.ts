import Node from "./Node";
import Cell from "./Cell";
import Token from "./Token";
import Bind from "./Bind";
import Expression from "./Expression";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import { TABLE_CLOSE_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";

export default class Row extends Node {

    readonly cells: Cell[];
    readonly close: Token;

    constructor(cells: Cell[], close?: Token) {

        super();

        this.cells = cells;
        this.close = close ?? new Token(TABLE_CLOSE_SYMBOL, [ TokenType.TABLE_CLOSE ]);
        
        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "cells", types:[[ Cell ]] },
            { name: "close", types:[ Token ] },
        ]; 
    }

    allBinds() { return this.cells.every(cell => cell.value instanceof Bind ); }
    allExpressions() { return this.cells.every(cell => !(cell.value instanceof Bind)); }

    computeConflicts() {}

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */ 
    isBindingEnclosureOfChild(child: Node): boolean { return this.cells.includes(child as Cell); }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Row(
            this.replaceChild(pretty, "cells", this.cells, original, replacement),
            this.replaceChild(pretty, "close", this.close, original, replacement)
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