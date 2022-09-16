import { MEASUREMENT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import AnyType from "./AnyType";
import type { ConflictContext } from "./Node";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unit from "./Unit";
import Unparsable from "./Unparsable";

export default class MeasurementType extends Type {
    
    readonly number: Token;
    readonly unit: Unit | Unparsable;

    constructor(number?: Token, unit?: Unit | Unparsable) {
        super();
        this.number = number ?? new Token("#", [ TokenType.NUMBER_TYPE ]);
        this.unit = unit ?? new Unit();
    }

    computeChildren() { 
        const children = [];
        children.push(this.number);
        if(this.unit) children.push(this.unit);
        return children;
        
    }

    isCompatible(context: ConflictContext, type: Type): boolean {
        if(type instanceof AnyType) return true;
        // Not a measurement? Not compatible.
        if(!(type instanceof MeasurementType)) return false;
        // One measurement without a unit? Compatible. Just inherit the other unit.
        if(this.unit === undefined && type.unit === undefined) return true;
        
        // Both with a unit? Convert to units and ask them.
        const thisUnit = this.unit instanceof Unit ? this.unit : new Unit([], []);
        const thatUnit = type.unit instanceof Unit ? type.unit : new Unit([], []);
        return thisUnit.isCompatible(context, thatUnit);
    }

    getNativeTypeName(): string { return MEASUREMENT_NATIVE_TYPE_NAME; }

    getDefinition(context: ConflictContext, node: Node, name: string) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(context, node, name); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new MeasurementType(
            this.number.cloneOrReplace([ Token ], original, replacement), 
            this.unit?.cloneOrReplace([ Unit, Unparsable ], original, replacement)
        ) as this; 
    }

}