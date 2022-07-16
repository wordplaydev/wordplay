import type Unit from "src/nodes/Unit";
import Value from "./Value";

export default class Measurement extends Value {

    readonly number: number;
    readonly unit: Unit;

    constructor(number: number, unit: Unit) {
        super();

        this.number = number;
        this.unit = unit;
    }

    toString() { return this.number.toString() + this.unit.toString(); }

}