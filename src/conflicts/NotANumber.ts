import type MeasurementLiteral from "../nodes/MeasurementLiteral";
import Conflict from "./Conflict";


export class NotANumber extends Conflict {
    readonly measurement: MeasurementLiteral;

    constructor(measurement: MeasurementLiteral) {
        super(false);
        this.measurement = measurement;
    }

    getConflictingNodes() {
        return { primary: [ this.measurement ] };
    }

    getExplanations() { 
        return {
            eng: `This number isn't formatted correctly`
        }
    }
}
