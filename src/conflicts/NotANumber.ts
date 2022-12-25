import type MeasurementLiteral from "../nodes/MeasurementLiteral";
import type Translations from "../nodes/Translations";
import { TRANSLATE } from "../nodes/Translations"
import Conflict from "./Conflict";


export class NotANumber extends Conflict {
    readonly measurement: MeasurementLiteral;

    constructor(measurement: MeasurementLiteral) {
        super(false);
        this.measurement = measurement;
    }

    getConflictingNodes() {
        return { primary: this.measurement, secondary: [] };
    }

    getPrimaryExplanation(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: `This number isn't formatted correctly`
        }
    }
}
