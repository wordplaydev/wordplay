import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";
import { WRITE } from "../nodes/Translations";
import type FunctionDefinition from "../nodes/FunctionDefinition";

export default class NoExpression extends Conflict {

    readonly def: FunctionDefinition;
    
    constructor(def: FunctionDefinition) { 
        super(true);

        this.def = def;
    }

    getConflictingNodes() {
        return { primary: [ this.def.names ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `Did you mean to give this function an expression?`,
            "😀": WRITE
        }
    }

}