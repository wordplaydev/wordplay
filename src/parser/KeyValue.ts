import type Expression from "./Expression";
import Node from "./Node";
import type { Token } from "./Token";

export default class KeyValue extends Node {

    readonly key: Expression;
    readonly bind: Token;
    readonly value: Expression;

    constructor(key: Expression, bind: Token, value: Expression) {
        super();

        this.key = key;
        this.bind = bind;
        this.value = value;
    }

    getChildren() {
        return [ this.key, this.bind, this.value ];
    }

    toWordplay(): string {
        return `${this.key.toWordplay()}${this.bind.toWordplay()}${this.value.toWordplay()}`;
    }

}