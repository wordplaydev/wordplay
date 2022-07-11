import Node from "./Node";
import Block from "./Block";
import type Borrow from "./Borrow";
import type Unparsable from "./Unparsable";
import type Conflict from "./Conflict";
import Function from "./Function";
import CustomType from "./CustomType";
import Bind from "./Bind";

export default class Program extends Node {
    
    readonly borrows: (Borrow | Unparsable)[];
    readonly block: Block | Unparsable;

    constructor(borrows: (Borrow|Unparsable)[], block: Block | Unparsable) {
        super();
        this.borrows = borrows.slice();
        this.block = block;
    }

    getChildren() { return [ ...this.borrows, this.block ]; }
    getConflicts(program: Program): Conflict[] { return []; }

    getBindingEnclosureOf(node: Node): Block | Function | CustomType | undefined {
        const ancestors = this.getAncestorsOf(node);
        // If the nearest ancestor is a function or custom type and the given node is a bind it it, ignore it.
        if(ancestors && ancestors.length > 0 && (ancestors[0] instanceof Function || ancestors[0] instanceof CustomType) && node instanceof Bind && ancestors[0].getChildren().includes(node))
            ancestors.shift();
        return ancestors?.find(a => a instanceof Block || a instanceof Function || a instanceof CustomType) as Block | Function | CustomType | undefined;
    }

}