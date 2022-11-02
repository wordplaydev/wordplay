import { MEASUREMENT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { MEASUREMENT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Type from "./Type";
import Unit from "./Unit";
import Unparsable from "./Unparsable";
import type BinaryOperation from "./BinaryOperation";
import Expression from "./Expression";
import NativeType from "./NativeType";
import { getPossibleUnits } from "../transforms/getPossibleUnits";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnionType from "./UnionType";

type UnitDeriver = (left: Unit, right: Unit, constant: number) => Unit;

export default class MeasurementType extends NativeType {
    
    readonly number: Token;
    readonly unit: Unit | Unparsable | UnitDeriver;

    constructor(number?: Token, unit?: Unit | Unparsable | UnitDeriver) {
        super();
        this.number = number ?? new Token(MEASUREMENT_SYMBOL, TokenType.NUMBER_TYPE);
        this.unit = unit ?? new Unit();
    }

    computeChildren() { 
        const children = [];
        children.push(this.number);
        if(this.unit instanceof Unit || this.unit instanceof Unparsable) children.push(this.unit);
        return children;   
    }

    accepts(type: Type, context: Context, op?: BinaryOperation): boolean {

        const types = type instanceof MeasurementType ? [ type ] : type instanceof UnionType ? type.getTypes(context).list() : [];
        
        if(types.length === 0) return false;

        // Are the units compatible? First, get concrete units.
        const thisUnit = this.concreteUnit(context, op);

        // Not a measurement? Not compatible.
        for(const possibleType of types) {
        
            if(!(possibleType instanceof MeasurementType)) return false;

            const thatUnit = possibleType.concreteUnit(context, op);
            
            // If this is a specific number, then the other must be specific too. Units must also be compatible.
            if(!((this.number.is(TokenType.NUMBER_TYPE) || this.number.getText() === possibleType.number.getText()) && thisUnit.accepts(thatUnit)))
                return false;
        }
        return true;

    }

    concreteUnit(context: Context, op?: BinaryOperation): Unit {

        if(this.unit instanceof Unit) return this.unit;
        else if(op === undefined || this.unit instanceof Unparsable || !(op.left instanceof Expression) || !(op.right instanceof Expression)) return new Unit();

        const leftType = op.left.getTypeUnlessCycle(context);
        const rightType = op.right.getTypeUnlessCycle(context);

        if(!(leftType instanceof MeasurementType)) return new Unit();
        if(!(rightType instanceof MeasurementType)) return new Unit();
        
        return this.unit.call(undefined, leftType.concreteUnit(context), rightType.concreteUnit(context), 0);
        
    }

    computeConflicts() {}

    getNativeTypeName(): string { return MEASUREMENT_NATIVE_TYPE_NAME; }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) { 
        return new MeasurementType(
            this.cloneOrReplaceChild(pretty, [ Token ], "number", this.number, original, replacement), 
            this.unit === undefined || this.unit instanceof Function ? this.unit : this.cloneOrReplaceChild(pretty, [ Unit, Unparsable ], "unit", this.unit, original, replacement)
        ) as this; 
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: this.unit instanceof Unit ? this.unit.getDescriptions().eng : "A number"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        const project = context.source.getProject();
        if(child === this.unit && project !== undefined) {
            // Any unit in the project
            return getPossibleUnits(project).map(unit => new Replace(context.source, child, unit));
        }

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.unit) return new Replace(context.source, child, new Unit());
    }
}