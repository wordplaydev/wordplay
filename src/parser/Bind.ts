import type Expression from "./Expression";
import Node from "./Node";
import type { Token } from "./Token";
import type Type from "./Type";

export default class Bind extends Node {
    
    readonly name: Token;
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon: Token;
    readonly value: Expression;

    constructor(name: Token, colon: Token, value: Expression, dot?: Token, type?: Type) {
        super();

        this.name = name;
        this.dot = dot;
        this.type = type;
        this.colon = colon;
        this.value = value;
    }

    getChildren() { return [ this.name, this.colon, this.value ]}
    toWordplay(): string {
        return `${this.name.toWordplay()}${this.dot === undefined ? "" : this.dot.toWordplay()}${this.type === undefined ? "" : this.type.toWordplay()}${this.colon.toWordplay()} ${this.value.toWordplay()}`;
    }

}