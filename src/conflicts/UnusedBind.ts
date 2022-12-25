import type Bind from "../nodes/Bind";
import Conflict from "./Conflict";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"

export default class UnusedBind extends Conflict {

    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);
        
        this.bind = bind;
    }

    getConflictingNodes() {
        return { primary: this.bind.names, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `No one use using ${this.bind.getNames().length === 1 ? "me" : "us"} :(`
        }
    }

}
