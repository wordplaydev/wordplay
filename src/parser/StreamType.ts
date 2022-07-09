import type Conflict from "./Conflict";
import Node from "./Node";
import type Program from "./Program";
import type { Token } from "./Token";
import type Type from "./Type";

export default class StreamType extends Node {

    readonly dots: Token;
    readonly type: Type;

    constructor(dots: Token, type: Type) {
        super();

        this.dots = dots;
        this.type = type;
    }

    getChildren() {
        return [ this.dots, this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}