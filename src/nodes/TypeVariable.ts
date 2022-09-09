import Node from "./Node";
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

}