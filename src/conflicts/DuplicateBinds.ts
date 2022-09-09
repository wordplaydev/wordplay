import type Bind from "../nodes/Bind";
import type Expression from "../nodes/Expression";
import type Token from "../nodes/Token";
import type TypeVariable from "../nodes/TypeVariable";
import Conflict from "./Conflict";

export class DuplicateBinds extends Conflict {
    readonly bind: Bind;
    readonly duplicates: (Expression | Bind | TypeVariable)[];
    
    constructor(bind: Bind, duplicates: (Expression | Bind | TypeVariable)[]) {
        super(false);
        this.bind = bind;
        this.duplicates = duplicates;
    }

    getConflictingNodes() {
        return this.bind.names.map(a => a.name).filter(n => n !== undefined) as Token[];
    }
}
