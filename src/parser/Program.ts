import Node from "./Node";
import type Block from "./Block";
import type Borrow from "./Borrow";
import type Unparsable from "./Unparsable";

export default class Program extends Node {
    
    readonly borrows: (Borrow | Unparsable)[];
    readonly block: Block | Unparsable;

    constructor(borrows: (Borrow|Unparsable)[], block: Block | Unparsable) {
        super();
        this.borrows = borrows.slice();
        this.block = block;
    }

    getChildren() { return [ ...this.borrows, this.block ]; }

    toWordplay(): string {
        return `${this.borrows.map(b => b.toWordplay()).join("\n")}${this.block.toWordplay()}`;
    }

}