import type Conflict from "./Conflict";
import type Conversion from "./Conversion";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";

export default class MeasurementType extends Type {
    
    readonly number?: Token;
    readonly unit?: Token;

    constructor(number?: Token, unit?: Token) {
        super();
        this.number = number;
        this.unit = unit;
    }

    getChildren() { 
        const children = [];
        if(this.number) children.push(this.number);
        if(this.unit) children.push(this.unit);
        return children;
        
    }

    getConflicts(program: Program): Conflict[] { return []; }

    isCompatible(program: Program, type: Type): boolean {
        return type instanceof MeasurementType && 
            (
                (this.unit === undefined && type.unit === undefined) ||
                (this.unit !== undefined && type.unit !== undefined && this.unit.text === type.unit.text)
            );
    }

    getConversion(program: Program, type: Type): Conversion | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

}