import type Name from "../nodes/Name";
import type Translations from "../nodes/Translations";
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

    getExplanations(): Translations { 
        return {
            eng: `I can't compute ${this.name.getName()} using itself!`,
            "😀": `TODO: ⟲`
        }
    }

}