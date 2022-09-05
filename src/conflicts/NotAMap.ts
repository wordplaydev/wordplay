import type MapLiteral from "../nodes/MapLiteral";
import Conflict from "./Conflict";


export class NotASetOrMap extends Conflict {
    readonly map: MapLiteral;
    constructor(set: MapLiteral) {
        super(false);
        this.map = set;
    }
}
