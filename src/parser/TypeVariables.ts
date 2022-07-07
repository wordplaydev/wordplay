import Node from "./Node";
import type { Token } from "./Token";

export default class TypeVariables extends Node {

    readonly open: Token;
    readonly names: Token[];
    readonly close: Token;

    constructor(open: Token, names: Token[], close: Token) {
        super();

        this.open = open;
        this.names = names.slice();
        this.close = close;
    }

    getChildren() {
        return [ this.open, ...this.names, this.close ];
    }

}