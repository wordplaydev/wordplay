import type AccessName from "../nodes/AccessName";
import Conflict from "./Conflict";

export class UnknownProperty extends Conflict {
    readonly access: AccessName;

    constructor(access: AccessName) {
        super(false);
        this.access = access;
    }

    getConflictingNodes() { 
        return { primary: [ this.access.name ], secondary: [ this.access.subject ] };
    }

    getExplanations() { 
        return {
            eng: `I don't know who I am!`
        }
    }

}