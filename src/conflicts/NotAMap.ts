import Expression from "../nodes/Expression";
import type MapLiteral from "../nodes/MapLiteral";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class NotAMap extends Conflict {
    readonly map: MapLiteral;

    constructor(set: MapLiteral) {
        super(false);
        this.map = set;
    }

    getConflictingNodes() {
        return { primary: this.map.values.filter(n => n instanceof Expression) };
    }

    getExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `These values aren't key:value pairs, but others are, so this is an invalid map literal.`
        }
    }

}