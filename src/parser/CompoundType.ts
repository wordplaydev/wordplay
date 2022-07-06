import type { Token } from "./Token";
import Type from "./Type";

export default class PrimitiveType extends Type {

    readonly open: Token;
    readonly type: Type;
    readonly close: Token;

    constructor(open: Token, type: Type, close: Token) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
    }

    getChildren() {
        return [ this.open, this.type, this.close ];
    }

    toWordplay(): string {
        return `${this.open.toWordplay()}${this.type.toWordplay()}${this.close.toWordplay()}`;
    }

}