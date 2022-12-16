import type {  NativeTypeName } from "../native/NativeConstants";
import { FUNCTION_SYMBOL, MEASUREMENT_SYMBOL } from "../parser/Tokenizer";
import type Context from "./Context";
import type Node from "./Node";
import Token from "./Token";
import TokenType from "./TokenType";
import Unit from "./Unit";
import BinaryOperation from "./BinaryOperation";
import NativeType from "./NativeType";
import { getPossibleUnits } from "../transforms/getPossibleUnits";
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import UnaryOperation from "./UnaryOperation";
import MeasurementLiteral from "./MeasurementLiteral";
import Measurement from "../runtime/Measurement";
import Evaluate from "./Evaluate";
import PropertyReference from "./PropertyReference";
import type TypeSet from "./TypeSet";

type UnitDeriver = (left: Unit, right: Unit | undefined, constant: number | undefined) => Unit;

export default class MeasurementType extends NativeType {
    
    readonly number: Token;
    readonly unit: Unit | UnitDeriver | true;

    readonly op: BinaryOperation | UnaryOperation | Evaluate | undefined;

    constructor(number: Token, unit?: Unit | UnitDeriver | true, op?: BinaryOperation | UnaryOperation | Evaluate) {
        super();

        this.number = number;
        this.unit = unit ?? new Unit();
        this.op = op;

        this.computeChildren();

    }

    static make(unit?: Unit | UnitDeriver | true, op?: BinaryOperation | UnaryOperation | Evaluate) {
        return new MeasurementType(new Token(MEASUREMENT_SYMBOL, TokenType.NUMBER_TYPE), unit ?? new Unit(), op);
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
            this.unit === undefined || this.unit instanceof Function ? this.unit : this.replaceChild("unit", this.unit === true ? undefined : this.unit, original, replacement)
        ) as this; 
    }

    hasDerivedUnit() { return this.unit instanceof Function; }
    isPercent() { return this.number.getText() === "%"; }

    /** All types are concrete unless noted otherwise. */
    isGeneric() { return this.hasDerivedUnit(); }

    withOp(op: BinaryOperation | UnaryOperation | Evaluate) {
        return new MeasurementType(this.number, this.unit, op);
    }

    withUnit(unit: Unit): MeasurementType { return new MeasurementType(this.number, unit); }

    acceptsAll(types: TypeSet, context: Context): boolean {

        // Are the units compatible? First, get concrete units.
        const thisUnit = this.concreteUnit(context);

        // See if all of the possible types are compatible.
        for(const possibleType of types.set) {

            // Not a measurement type? Not compatible.
            if(!(possibleType instanceof MeasurementType)) return false;

            // If it is a measurement type, get it's unit.
            const thatUnit = possibleType.concreteUnit(context);

            // If this is a percent and the possible type has a unit, it's not compatible.
            if(this.isPercent() && !thatUnit.isUnitless())
                return false;
            
            // If this is a specific number, then all other possible type must be the same specific number.
            if(this.number.is(TokenType.NUMBER) && this.number.getText() !== possibleType.number.getText())
                return false;

            // If the units aren't compatible, then the the types aren't compatible.
            if(this.unit !== true && !thisUnit.accepts(thatUnit))
                return false;
        }
        return true;

    }

    concreteUnit(context: Context): Unit {

        // If it's a concrete unit or a wildcard, just return it.
        if(this.unit instanceof Unit) return this.unit;

        // If it's a concrete unit, just return it.
        if(this.unit === true) return new Unit();

        // If the unit is derived, then there must be an operation for it.
        if(this.op === undefined) {
            console.error("MeasurementType with derived unit didn't receive an operator, so unit can't be derived.");
            return new Unit();
        }

        // What is the type of the left?
        const leftType = 
            this.op instanceof BinaryOperation ? this.op.left.getType(context) : 
            this.op instanceof UnaryOperation ? this.op.operand.getType(context) : 
            this.op.func instanceof PropertyReference ? this.op.func.structure.getType(context) :
            undefined;
        const rightType = 
            this.op instanceof BinaryOperation ? this.op.right.getType(context) : 
            this.op instanceof Evaluate && this.op.inputs.length > 0 ? this.op.inputs[0].getType(context) :
            undefined;

        // If either type isn't a measurement type — which shouldn't be possible for binary operations or evaluates — then we just return a blank unit.
        if(!(leftType instanceof MeasurementType)) return new Unit();
        if(!(this.op instanceof UnaryOperation) && !(rightType instanceof MeasurementType)) return new Unit();

        // Get the constant from the right if available.
        const constant = this.op instanceof BinaryOperation && this.op.right instanceof MeasurementLiteral? new Measurement(this, this.op.right.number).toNumber() : undefined;
        
        // Recursively concretize the left and right units and pass them to the derive the concrete unit.
        return this.unit(leftType.concreteUnit(context), rightType instanceof MeasurementType ? rightType.concreteUnit(context) : undefined, constant);
        
    }

    computeConflicts() {}

    getNativeTypeName(): NativeTypeName { return "measurement"; }

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