import type Bind from "../nodes/Bind";
import type Expression from "../nodes/Expression";
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
        return this.bind.names;
    }

    getExplanations() { 
        return {
            eng: `${this.bind.names[0].getName()} is declared multiple times.`
        }
    }

}
