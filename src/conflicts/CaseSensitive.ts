import type Alias from "../nodes/Alias";
import type Name from "../nodes/Name";
import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";

export default class CaseSensitive extends Conflict {

    readonly name: Name | Alias;
    readonly alias: Alias;
    
    constructor(name: Name | Alias, alias: Alias) { 
        super(true);

        this.name = name;
        this.alias = alias;
    }

    getConflictingNodes() {
        return { primary: [ this.name ], secondarty: [ this.alias ] };
    }

    getExplanations(): Translations { 
        return {
            eng: `This name ${this.name.getName()} looks a lot like ${this.alias.getName()}, but they're different.`
        }
    }

}