import type Name from "../nodes/Name";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations";
import Conflict from "./Conflict";

export default class CaseSensitive extends Conflict {

    readonly name: Name;
    readonly aliases: Name[];
    
    constructor(name: Name, aliases: Name[]) { 
        super(true);

        this.name = name;
        this.aliases = aliases;
    }

    getConflictingNodes() {
        return { primary: this.name, secondary: this.aliases };
    }

    getPrimaryExplanation(): Translations { 
        return {
            eng: `This name "${this.name.getName()}" looks a lot like "${this.aliases[0].getName()}", but they're different cases.`,
            "😀": `${TRANSLATE} ${this.name.getName()} ≠ ${this.aliases[0].getName()}`
        }
    }

}