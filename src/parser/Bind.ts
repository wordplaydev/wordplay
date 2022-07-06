import type Expression from "./Expression";
import Node from "./Node";
import type { Token } from "./Token";
import type Type from "./Type";
import type Unparsable from "./Unparsable";

export default class Bind extends Node {
    
    readonly name: Token;
    readonly dot?: Token;
    readonly type?: Type;
    readonly colon: Token;
    readonly value: Expression;

    constructor(name: Token, colon: Token, value: Expression, dot?: Token, type?: Type | Unparsable) {
        super();

        this.name = name;
        this.colon = colon;
        this.value = value;
        this.dot = dot;
        this.type = type;
    }

    getChildren() { return this.type !== undefined && this.dot !== undefined ? [ this.name, this.dot, this.type, this.colon, this.value ]: [ this.name, this.colon, this.value ] }
    toWordplay(): string {
        return `${this.name.toWordplay()}${this.dot === undefined ? "" : this.dot.toWordplay()}${this.type === undefined ? "" : this.type.toWordplay()}${this.colon.toWordplay()} ${this.value.toWordplay()}`;
    }

}