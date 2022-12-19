import Node from "./Node";
import Token from "./Token";
import Bind from "./Bind";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import Expression from "./Expression";

export default class Row extends Node {

    readonly open: Token;
    readonly cells: (Bind|Expression)[];
    readonly close: Token | undefined;

    constructor(open: Token, cells: (Bind|Expression)[], close: Token | undefined) {

        super();

        this.open = open;
        this.cells = cells;
        this.close = close;
        
        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "open", types: [ Token ] },
            { name: "cells", types: [ [ Bind, Expression ] ] },
            { name: "close", types: [ Token, undefined ] },
        ]; 
    }

    allBinds() { return this.cells.every(cell => cell instanceof Bind ); }
    allExpressions() { return this.cells.every(cell => !(cell instanceof Bind)); }

    computeConflicts() {}

    /**
     * Is a binding enclosure of its columns and rows, because it defines columns.
     * */ 
    isBindingEnclosureOfChild(child: Node): boolean { return this.cells.includes(child as (Expression | Bind)); }

    replace(original?: Node, replacement?: Node) { 
        return new Row(
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("cells", this.cells, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
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