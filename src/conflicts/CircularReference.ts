import type Reference from "../nodes/Reference";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";

export default class CircularReference extends Conflict {

    readonly name: Reference;
    
    constructor(name: Reference) { 
        super(true);

        this.name = name;
    }

    getConflictingNodes() {
        return { primary: [ this.name ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `I can't compute ${this.name.getName()} using itself!`,
            "😀": `${TRANSLATE} ⟲`
        }
    }

}