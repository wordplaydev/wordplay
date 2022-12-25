import type Reference from "../nodes/Reference";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class UnexpectedTypeVariable extends Conflict {
    readonly name: Reference;
    
    constructor(name: Reference) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `I describe kinds of values, but I'm not one. I don't now what to do!`
        }
    }

}
