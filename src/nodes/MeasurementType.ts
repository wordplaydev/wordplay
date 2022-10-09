import { MEASUREMENT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { MEASUREMENT_SYMBOL } from "../parser/Tokenizer";
import AnyType from "./AnyType";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import Unit from "./Unit";
import Unparsable from "./Unparsable";
import type BinaryOperation from "./BinaryOperation";
import Expression from "./Expression";
import UnionType from "./UnionType";

type UnitDeriver = (left: Unit, right: Unit, constant: number) => Unit;

export default class MeasurementType extends Type {
    
    readonly number: Token;
    readonly unit: Unit | Unparsable | UnitDeriver;

    constructor(number?: Token, unit?: Unit | Unparsable | UnitDeriver) {
        super();
        this.number = number ?? new Token(MEASUREMENT_SYMBOL, [ TokenType.NUMBER_TYPE ]);
        this.unit = unit ?? new Unit();
    }

    computeChildren() { 
        const children = [];
        children.push(this.number);
        if(this.unit instanceof Unit || this.unit instanceof Unparsable) children.push(this.unit);
        return children;   
    }

    isCompatible(type: Type, context: Context, op?: BinaryOperation): boolean {

        if(type instanceof AnyType) return true;

        // Union type? Can this be applied ot any of the union's types?
        if(type instanceof UnionType) return type.isCompatible(this, context);
        
        // Not a measurement? Not compatible.
        if(!(type instanceof MeasurementType)) return false;
        
        // Are the units compatible? First, get concrete units.
        const thisUnit = this.concreteUnit(context, op);
        const thatUnit = type.concreteUnit(context, op);

        // Return true if the units are compatible.
        return thisUnit.isCompatible(thatUnit);
    }

    concreteUnit(context: Context, op?: BinaryOperation): Unit {

        if(this.unit instanceof Unit) return this.unit;
        else if(op === undefined || this.unit instanceof Unparsable || !(op.left instanceof Expression) || !(op.right instanceof Expression)) return new Unit([], []);

        const leftType = op.left.getTypeUnlessCycle(context);
        const rightType = op.right.getTypeUnlessCycle(context);

        if(!(leftType instanceof MeasurementType)) return new Unit();
        if(!(rightType instanceof MeasurementType)) return new Unit();
        
        return this.unit.call(undefined, leftType.concreteUnit(context), rightType.concreteUnit(context), 0);
        
    }

    computeConflicts() {}

    getNativeTypeName(): string { return MEASUREMENT_NATIVE_TYPE_NAME; }

    getDefinition(name: string, context: Context, node: Node) {
        return context.native?.getStructureDefinition(this.getNativeTypeName())?.getDefinition(name, context, node); 
    }

    clone(original?: Node, replacement?: Node) { 
        return new MeasurementType(
            this.number.cloneOrReplace([ Token ], original, replacement), 
            this.unit === undefined || this.unit instanceof Function ? this.unit : this.unit.cloneOrReplace([ Unit, Unparsable ], original, replacement)
        ) as this; 
    }

}