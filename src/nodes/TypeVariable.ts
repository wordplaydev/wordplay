import type Conflict from "../conflicts/Conflict";
import Node, { type ConflictContext } from "./Node";
import type Token from "./Token";

export default class TypeVariable extends Node {

    readonly type: Token;
    readonly name: Token;

    constructor(type: Token, name: Token) {
        super();

        this.type = type;
        this.name = name;
    }

    computeChildren() {
        return [ this.type, this.name ];
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

}