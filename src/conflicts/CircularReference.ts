import type Name from "../nodes/Name";
import type { ConflictExplanations } from "./Conflict";
import Conflict from "./Conflict";

export default class CircularReference extends Conflict {

    readonly name: Name;
    
    constructor(name: Name) { 
        super(true);

        this.name = name;
    }

    getConflictingNodes() {
        return { primary: [ this.name ] };
    }

    getExplanations(): ConflictExplanations { 
        return {
            eng: `I can't compute ${this.name.getName()} using itself!`
        }
    }

}