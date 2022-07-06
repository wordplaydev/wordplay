import Node from "./Node";
import type { Token } from "./Token";

export default class Borrow extends Node {
    
    readonly borrow: Token;
    readonly name: Token;
    readonly version?: Token;

    constructor(borrow: Token, name: Token, version?: Token) {
        super();

        this.borrow = borrow;
        this.name = name;
        this.version = version;
    }

    getChildren() { return this.version === undefined ? [ this.borrow, this.name ] : [ this.borrow, this.name, this.version ]}
    toWordplay(): string {
        return `${this.borrow.toWordplay()} ${this.name.toWordplay()}${this.version === undefined ? "" : " " + this.version.toWordplay()}`;
    }

}