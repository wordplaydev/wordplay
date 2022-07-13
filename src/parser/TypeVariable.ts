import type Conflict from "./Conflict";
import Node from "./Node";
import type Program from "./Program";
import type Token from "./Token";

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly name: Token;

    constructor(type: Token, name: Token) {
        super();

        this.type = type;
        this.name = name;
    }

    getChildren() {
        return [ this.type, this.name ];
    }

    getConflicts(program: Program): Conflict[] { return []; }

}