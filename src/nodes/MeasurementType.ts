import type Conflict from "../parser/Conflict";
import type ConversionDefinition from "./ConversionDefinition";
import type { ConflictContext } from "./Node";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import Unit from "./Unit";
import type Unparsable from "./Unparsable";

export default class MeasurementType extends Type {
    
    readonly number?: Token;
    readonly unit?: Unit | Unparsable;

    constructor(number?: Token, unit?: Unit | Unparsable) {
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

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        // Not a measurement? Not compatible.
        if(!(type instanceof MeasurementType)) return false;
        // One measurement without a unit? Compatible. Just inherit the other unit.
        if(this.unit === undefined && type.unit === undefined) return true;
        
        // Both with a unit? Convert to units and ask them.
        const thisUnit = this.unit instanceof Unit ? this.unit : new Unit([], []);
        const thatUnit = type.unit instanceof Unit ? type.unit : new Unit([], []);
        return thisUnit.isCompatible(context, thatUnit);
    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

}