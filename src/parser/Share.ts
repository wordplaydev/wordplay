import Bind from "./Bind";
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

        const conflicts = [];

        // Shares can only appear in the program's root block.
        if(!program.block.getChildren().includes(this))
            conflicts.push(new Conflict(this, SemanticConflict.SHARE_NOT_ALLOWED));

        // Bindings must have language tags on all names to clarify what langauge they're written in.
        if(this.bind instanceof Bind && !this.bind.names.every(n => n.lang !== undefined))
            conflicts.push(new Conflict(this, SemanticConflict.SHARING_REQUIRES_LANGUAGES))

        return conflicts;

    }

}