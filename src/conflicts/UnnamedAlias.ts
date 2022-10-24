import type Alias from "../nodes/Alias";
import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";

export default class UnnamedAlias extends Conflict {
    readonly alias: Alias;
    constructor(alias: Alias) {
        super(true);
        this.alias = alias;
    }

    getConflictingNodes() {
        return { primary: [ this.alias ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `Don't forget to name me!`
        }
    }

}
