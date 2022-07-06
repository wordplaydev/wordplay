import type { Token } from "./Token";
import Type from "./Type";

export default class UnionType extends Type {

    readonly left: Type;
    readonly bar: Token;
    readonly right: Type;

    constructor(left: Type, bar: Token, right: Type) {
        super();

        this.left = left;
        this.bar = bar;
        this.right = right;
    }

    getChildren() {
        return [ this.left, this.bar, this.right ];
    }

    toWordplay(): string {
        return `${this.left.toWordplay()}${this.bar.toWordplay()}${this.right.toWordplay()}`;
    }

}