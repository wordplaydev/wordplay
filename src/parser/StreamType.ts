import type Conflict from "./Conflict";
import Node from "./Node";
import type Program from "./Program";
import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class StreamType extends Node {

    readonly dots: Token;
    readonly type: Type | Unparsable;

    constructor(dots: Token, type: Type | Unparsable) {
        super();

        this.dots = dots;
        this.type = type;
    }

    getChildren() {
        return [ this.dots, this.type ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof StreamType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(program, type.type);
    }

}