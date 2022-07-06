import type { Token } from "./Token";
import Type from "./Type";

export default class MapType extends Type {

    readonly open: Token;
    readonly key: Type;
    readonly bind: Token;
    readonly value: Type;
    readonly close: Token;

    constructor(open: Token, key: Type, bind: Token, value: Type, close: Token) {
        super();

        this.open = open;
        this.key = key;
        this.bind = bind;
        this.value = value;
        this.close = close;
    }

    getChildren() {
        return [ this.open, this.key, this.bind, this.value, this.close ];
    }

    toWordplay(): string {
        return `${this.open.toWordplay()}${this.key.toWordplay()}${this.bind.toWordplay()}${this.value.toWordplay()}${this.close.toWordplay()}`;
    }

}