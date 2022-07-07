import type Bind from "./Bind";
import Node from "./Node";
import type { Token } from "./Token";
import type Unparsable from "./Unparsable";

export default class Share extends Node {
    
    readonly share: Token;
    readonly bind: Bind | Unparsable;

    constructor(share: Token, bind: Bind | Unparsable) {
        super();

        this.share = share;
        this.bind = bind;
    }

    getChildren() { return [ this.share, this.bind ]; }

}