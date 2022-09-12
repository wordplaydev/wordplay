import Expression from "../nodes/Expression";
import type MapLiteral from "../nodes/MapLiteral";
import Conflict from "./Conflict";


export class NotASetOrMap extends Conflict {
    readonly map: MapLiteral;

    constructor(set: MapLiteral) {
        super(false);
        this.map = set;
    }

    getConflictingNodes() {
        return this.map.values.filter(n => n instanceof Expression);
    }

    getExplanations() { 
        return {
            eng: `These values aren't key:value pairs, but others are, so this is an invalid map literal.`
        }
    }

}