import type NameType from "../nodes/NameType";
import Conflict from "./Conflict";


export class UnknownTypeName extends Conflict {
    readonly name: NameType;

    constructor(name: NameType) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() { 
        return { primary: [ this.name ] }; 
    }

    getExplanations() { 
        return {
            eng: `I don't know what type I am!`
        }
    }

}
