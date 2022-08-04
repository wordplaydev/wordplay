import type ConversionDefinition from "../nodes/ConversionDefinition";
import Conflict from "./Conflict";


export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;
    constructor(conversion: ConversionDefinition) {
        super(false);
        this.conversion = conversion;
    }
}
