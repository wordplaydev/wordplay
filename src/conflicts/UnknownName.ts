import type Token from "../nodes/Token";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";

export class UnknownName extends Conflict {
    
    readonly name: Token;
    
    constructor(name: Token) {
        super(false);
        this.name = name;
    }

    getConflictingNodes() {
        return { primary: [ this.name ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `I don't know who I am!`
        }
    }

}