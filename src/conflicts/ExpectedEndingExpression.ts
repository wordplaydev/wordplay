import type Block from "../nodes/Block";
import Conflict from "./Conflict";


export class ExpectedEndingExpression extends Conflict {
    readonly block: Block;
    constructor(block: Block) {
        super(false);
        this.block = block;
    }
}
