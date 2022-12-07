import { MEASUREMENT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import { FUNCTION_SYMBOL, MEASUREMENT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import type Type from "./Type";
import Unit from "./Unit";
import BinaryOperation from "./BinaryOperation";
import NativeType from "./NativeType";
import { getPossibleUnits } from "../transforms/getPossibleUnits";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnionType from "./UnionType";
import UnaryOperation from "./UnaryOperation";
import MeasurementLiteral from "./MeasurementLiteral";
import Measurement from "../runtime/Measurement";
import Evaluate from "./Evaluate";
import PropertyReference from "./PropertyReference";
import UnknownType from "./UnknownType";

type UnitDeriver = (left: Unit, right: Unit, constant: number | undefined) => Unit;

export default class MeasurementType extends NativeType {
    
    readonly number: Token;
    readonly unit: Unit | UnitDeriver;

    readonly op: BinaryOperation | UnaryOperation | Evaluate | undefined;

    constructor(number?: Token, unit?: Unit | UnitDeriver, op?: BinaryOperation | UnaryOperation | Evaluate) {
        super();

        this.number = number ?? new Token(MEASUREMENT_SYMBOL, TokenType.NUMBER_TYPE);
        this.unit = unit ?? new Unit();
        this.op = op;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "number", types:[ Token ] },
            { name: "unit", types:[ Unit ] },
        ]; 
    }

    replace(original?: Node, replacement?: Node) { 
        return new MeasurementType(
            this.replaceChild("number", this.number, original, replacement), 
            this.unit === undefined || this.unit instanceof Function ? this.unit : this.replaceChild("unit", this.unit, original, replacement)
        ) as this; 
    }

    hasDerivedUnit() { return this.unit instanceof Function; }

    /** All types are concrete unless noted otherwise. */
    isGeneric() { return this.hasDerivedUnit(); }

    withOp(op: BinaryOperation | UnaryOperation | Evaluate) {
        return new MeasurementType(this.number, this.unit, op);
    }

    withUnit(unit: Unit): MeasurementType { return new MeasurementType(this.number, unit); }

    accepts(type: Type, context: Context): boolean {

        const types = type instanceof MeasurementType ? [ type ] : type instanceof UnionType ? type.getTypes(context).list() : [];
        
        if(types.length === 0) return false;

        // Are the units compatible? First, get concrete units.
        const thisUnit = this.concreteUnit(context);

        // See if all of the possible types are compatible.
        for(const possibleType of types) {

            // Not a measurement type? Not compatible.
            if(!(possibleType instanceof MeasurementType)) return false;

            // If it is a measurement type, get it's unit.
            const thatUnit = possibleType.concreteUnit(context);
            
            // If this is a specific number, then all other possible type must be the same specific number.
            if(!this.number.is(TokenType.NUMBER_TYPE) && this.number.getText() !== possibleType.number.getText())
                return false;

            // If the units aren't compatible, then the the types aren't compatible.
            if(!thisUnit.accepts(thatUnit))
                return false;
        }
        return true;

    }

    concreteUnit(context: Context): Unit {

        // If it's a concrete unit, just return it.
        if(this.unit instanceof Unit) return this.unit;

        // If the unit is derived, then there must be an operation for it.
        if(this.op === undefined) {
            console.error("MeasurementType with derived unit didn't receive an operator, so unit can't be derived.");
            return new Unit();
        }

        // If the operator doesn't have a type
        const leftType = 
            this.op instanceof BinaryOperation ? this.op.left.getTypeUnlessCycle(context) : 
            this.op instanceof UnaryOperation ? this.op.operand.getTypeUnlessCycle(context) : 
            this.op.func instanceof PropertyReference ? this.op.func.structure.getTypeUnlessCycle(context) :
            new UnknownType({ typeVar: this.op });
        const rightType = 
            this.op instanceof BinaryOperation ? this.op.right.getTypeUnlessCycle(context) : 
            this.op instanceof Evaluate && this.op.inputs.length > 0 ? this.op.inputs[0].getTypeUnlessCycle(context) :
            new UnknownType({ typeVar: this.op });

        // If either type isn't a measurement type — which shouldn't be possible — then we just return a blank unit.
        if(!(leftType instanceof MeasurementType)) return new Unit();
        if(!(rightType instanceof MeasurementType)) return new Unit();

        // Get the constant from the right if available.
        const constant = this.op instanceof BinaryOperation && this.op.right instanceof MeasurementLiteral? new Measurement(this, this.op.right.number).toNumber() : undefined;
        
        // Recursively concretize the left and right units and pass them to the derive the concrete unit.
        return this.unit(leftType.concreteUnit(context), rightType.concreteUnit(context), constant);
        
    }

    computeConflicts() {}

    getNativeTypeName(): string { return MEASUREMENT_NATIVE_TYPE_NAME; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: this.unit instanceof Unit ? this.unit.getDescriptions().eng : "A number"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        const project = context.project;
        if(child === this.unit && project !== undefined) {
            // Any unit in the project
            return getPossibleUnits(project).map(unit => new Replace(context, child, unit));
        }

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.unit) return new Replace(context, child, new Unit());
    }

    toWordplay() { return super.toWordplay() + (this.unit instanceof Function ? FUNCTION_SYMBOL : ""); }
}