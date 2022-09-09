import type Node from "../nodes/Node";
import type Bind from "../nodes/Bind";
import Conflict, { type ConflictExplanations } from "./Conflict";
import type Alias from "../nodes/Alias";

export default class DuplicateAliases extends Conflict {

    readonly bind: Bind;
    readonly duplicates: Alias[][];

    constructor(bind: Bind, duplicates: Alias[][]) {

        super(true);

        this.bind = bind;
        this.duplicates = duplicates;

    }

    getConflictingNodes(): Node[] { 
        return this.duplicates.flat();
    
    }
    getExplanations(): ConflictExplanations { 
        return {
            eng: `Can't have duplicate names ${this.duplicates.flat().map(a => a.getName())}`
        }
    }

}