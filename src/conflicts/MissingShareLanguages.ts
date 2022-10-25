import type Share from "../nodes/Share";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class MissingShareLanguages extends Conflict {
    readonly share: Share;

    constructor(share: Share) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return { primary: [ this.share ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `To share something, you must tag it's names with languages.`
        }
    }

}
