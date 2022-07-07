import type { Token } from "./Token";
import Type from "./Type";

export default class MeasurementType extends Type {
    
    readonly number: Token;
    readonly unit?: Token;

    constructor(number: Token, unit?: Token) {
        super();
        this.number = number;
        this.unit = unit;
    }

    getChildren() { return this.unit !== undefined ? [ this.number, this.unit ] : [ this.number ]; }

}