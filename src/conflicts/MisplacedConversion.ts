import type ConversionDefinition from "../nodes/ConversionDefinition";
import type Translations from "../nodes/Translations";
import Conflict from "./Conflict";


export class MisplacedConversion extends Conflict {
    readonly conversion: ConversionDefinition;
    
    constructor(conversion: ConversionDefinition) {
        super(false);
    
        this.conversion = conversion;
    }

    getConflictingNodes() {
        return { primary: [ this.conversion ] };
    }

    getExplanations(): Translations { 
        return {
            "😀": "TODO",
            eng: `Can't put a conversion here.`
        }
    }

}
