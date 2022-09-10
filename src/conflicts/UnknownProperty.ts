import type AccessName from "../nodes/AccessName";
import Conflict from "./Conflict";

export class UnknownProperty extends Conflict {
    readonly access: AccessName;

    constructor(access: AccessName) {
        super(false);
        this.access = access;
    }

    getConflictingNodes() { return [ this.access.name ]; }

    getExplanations() { 
        return {
            eng: `I don't know who I am!`
        }
    }

}