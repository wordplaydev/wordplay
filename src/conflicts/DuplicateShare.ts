import type Bind from "../nodes/Bind";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class DuplicateShare extends Conflict {
    readonly share: Bind;
    readonly other: Bind;
    constructor(share: Bind, other: Bind) {
        super(false);
        this.share = share;
        this.other = other;
    }

    getConflictingNodes() {
        return { primary: this.share.names, secondary: [ this.other.names ] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            eng: `This share has the same name as a share in another file.`,
            "😀": TRANSLATE
        }
    }

}