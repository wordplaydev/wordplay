import type Bind from "../nodes/Bind";
import Conflict from "./Conflict";
import type Token from "../nodes/Token";
import type Translations from "../nodes/Translations";

export class UnusedBind extends Conflict {

    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);
        
        this.bind = bind;
    }

    getConflictingNodes() {
        return { primary: this.bind.names.map(a => a.name).filter(n => n !== undefined) as Token[] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `No one use using ${this.bind.getNames().length === 1 ? "me" : "us"} :(`
        }
    }

}
