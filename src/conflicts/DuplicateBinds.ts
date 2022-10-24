import type Bind from "../nodes/Bind";
import type Translations from "../nodes/Translations";
import type TypeVariable from "../nodes/TypeVariable";
import Conflict from "./Conflict";

export class DuplicateBinds extends Conflict {

    readonly bind: Bind;
    readonly duplicates: (Bind | TypeVariable)[];
    
    constructor(bind: Bind, duplicates: (Bind | TypeVariable)[]) {

        super(false);

        this.bind = bind;
        this.duplicates = duplicates;

    }

    getConflictingNodes() {
        return { primary: this.bind.aliases , secondary: this.duplicates };
    }

    getExplanations(): Translations { 
        return {
            eng: `${this.bind.aliases[0].getName()} is already defined.`,
            "😀": `${this.bind.aliases[0].getName()} ${this.bind.aliases[0].getName()}`
        }
    }

}
