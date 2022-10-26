import type Name from "../nodes/Name";
import type Reference from "../nodes/Reference";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations";
import Conflict from "./Conflict";

export default class CaseSensitive extends Conflict {

    readonly name: Reference | Name;
    readonly alias: Name;
    
    constructor(name: Reference | Name, alias: Name) { 
        super(true);

        this.name = name;
        this.alias = alias;
    }

    getConflictingNodes() {
        return { primary: [ this.name ], secondarty: [ this.alias ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `This name ${this.name.getName()} looks a lot like ${this.alias.getName()}, but they're different cases.`,
            "😀": `${TRANSLATE} ${this.name.getName()} ≠ ${this.alias.getName()}`
        }
    }

}