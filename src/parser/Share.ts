import type Bind from "./Bind";
import Conflict from "./Conflict";
import Node from "./Node";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
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

    getConflicts(program: Program): Conflict[] {

        return program.block.getChildren().includes(this) ? [] : [ new Conflict(this, SemanticConflict.SHARE_NOT_ALLOWED)]

    }

}