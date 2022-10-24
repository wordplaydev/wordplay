import type AccessName from "../nodes/AccessName";
import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";

export class UnknownProperty extends Conflict {
    readonly access: AccessName;

    constructor(access: AccessName) {
        super(false);
        this.access = access;
    }

    getConflictingNodes() { 
        return { primary: [ this.access.name ?? this.access.access ], secondary: [ this.access.subject ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `I don't know who I am!`
        }
    }

}