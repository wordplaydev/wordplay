import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import MeasurementType from "../nodes/MeasurementType";
import NoneType from "../nodes/NoneType";
import StructureDefinition from "../nodes/StructureDefinition";
import type Type from "../nodes/Type";
import UnionType from "../nodes/UnionType";
import Unit from "../nodes/Unit";
import Bool from "../runtime/Bool";
import Measurement from "../runtime/Measurement";
import Text from "../runtime/Text";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import { createNativeConversion } from "./NativeBindings";
import NativeExpression from "./NativeExpression";

export default function bootstrapMeasurement() {

    const measurementOperandName = "val";

    function createNativeMeasurementOperation(names: string[], inputType: Type, outputType: Type, expression: (left: Measurement, right: Measurement) => Value | undefined, requireEqualUnits: boolean=true) {
        return new FunctionDefinition(
            [], names.map(n => new Alias(n)), [],
            [ new Bind([], undefined, [ new Alias(measurementOperandName) ], inputType) ],
            new NativeExpression(
                new MeasurementType(),
                evaluation => {
                    const left = evaluation.getContext();
                    const right = evaluation.resolve(measurementOperandName);
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if(!(left instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), left);
                    if(!(right instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                    if(requireEqualUnits && !left.unit.isEqualTo(right.unit)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                    return expression(left, right) ?? new TypeException(evaluation.getEvaluator(), left.getType(), right);
                },
                { eng: "Native measurement operation." }
            ),
            outputType
        );    
    }
    

    return new StructureDefinition(
        [], [], [], [], [],
        new Block([], [
            createNativeMeasurementOperation(
                ["+"],
                // The operand's type should be the left's type.
                new MeasurementType(undefined, left => left), 
                // The output's type should be the left's type
                new MeasurementType(undefined, left => left),
                (left, right) => left.add(right)
            ),
            createNativeMeasurementOperation(
                ["-"], 
                // The operand's type should be the left's type.
                new MeasurementType(undefined, left => left), 
                // The output's type should be the left's type
                new MeasurementType(undefined, left => left),                
                (left, right) => left.subtract(right)
            ),
            createNativeMeasurementOperation(
                ["×", "·"], 
                // The operand's type can be any unitless measurement
                new MeasurementType(),
                // The output's type is is the unit's product
                new MeasurementType(undefined, (left, right) => left.product(right)),
                (left, right) => left.multiply(right),
                false
            ),
            createNativeMeasurementOperation(
                ["÷"], 
                new MeasurementType(), 
                new MeasurementType(undefined, (left, right) => left.quotient(right)),
                (left, right) => left.divide(right),
                false
            ),
            // TODO Output type should be subject type
            createNativeMeasurementOperation(
                ["%"], 
                new MeasurementType(), 
                new UnionType(
                    new MeasurementType(undefined, left => left), 
                    new NoneType([new Alias("nan", "eng")])
                ),
                (left, right) => left.remainder(right),
                false
            ),
            // Exponentiation units
            // if(!(leftType instanceof MeasurementType)) return new UnknownType(this);
            // if(!(rightType instanceof MeasurementType)) return new UnknownType(this);
            // if(leftType.unit instanceof Unparsable || rightType.unit instanceof Unparsable) return new UnknownType(this);

            // // If both sides or unitless, just propagate the left.
            // if(leftType.unit === undefined && rightType.unit === undefined) return leftType;
            // // If left has a unit and the right does not, duplicate the units the number of times of the power
            // else if(leftType.unit !== undefined && rightType.unit === undefined) {
            //     // Can we extract the exponent?
            //     let exponent = undefined;
            //     if(this.right instanceof MeasurementLiteral && this.right.isInteger())
            //         exponent = parseInt(this.right.number.text.toString());
            //     else if(this.right instanceof UnaryOperation && this.right.operand instanceof MeasurementLiteral && this.right.operand.isInteger())
            //         exponent = parseInt(this.right.operand.number.text.toString());
            //     // If the exponent is computed, and we don't know it's an integer, drop the unit.
            //     return new MeasurementType(undefined, exponent === undefined ? new Unit() : leftType.unit.power(new Decimal(exponent)));
            // } 
            // // Otherwise, undefined: exponents can't have units.
            // else return new UnknownType(this);
            createNativeMeasurementOperation(
                ["^"], 
                new MeasurementType(), 
                new MeasurementType(undefined, (left, right, constant) => right === right && constant === undefined ? new Unit() : left.power(constant)),
                (left, right) => left.power(right),
                false
            ),
            createNativeMeasurementOperation(
                ["<"], new MeasurementType(), new BooleanType(),
                (left, right) => left.lessThan(right)
            ),
            createNativeMeasurementOperation(
                [">"], new MeasurementType(), new BooleanType(),
                (left, right) => left.greaterThan(right)
            ),
            createNativeMeasurementOperation(
                ["≤"], new MeasurementType(), new BooleanType(),
                (left, right) => new Bool(left.lessThan(right).bool || left.isEqualTo(right))
            ),
            createNativeMeasurementOperation(
                ["≥"], new MeasurementType(), new BooleanType(),
                (left, right) => new Bool(left.greaterThan(right).bool || left.isEqualTo(right))
            ),
            createNativeMeasurementOperation(
                ["="], new MeasurementType(), new BooleanType(),
                (left, right) => new Bool(left.isEqualTo(right))
            ),
            createNativeMeasurementOperation(
                ["≠"], new MeasurementType(), new BooleanType(),
                (left, right) => new Bool(!left.isEqualTo(right))
            ),
        
            // Time
            createNativeConversion([], '#', "''", (val: Measurement) => new Text(val.toString())),
            createNativeConversion([], '#s', "#min", (val: Measurement) => val.divide(new Measurement(60, new Unit(["s"], ["min"])))),
            createNativeConversion([], '#s', "#h", (val: Measurement) => val.divide(new Measurement(3600, new Unit(["s"], ["h"])))),
            createNativeConversion([], '#s', "#day", (val: Measurement) => val.divide(new Measurement(86400, new Unit(["s"], ["day"])))),
            createNativeConversion([], '#s', "#wk", (val: Measurement) => val.divide(new Measurement(604800, new Unit(["s"], ["wk"])))),
            createNativeConversion([], '#s', "#yr", (val: Measurement) => val.divide(new Measurement(31449600, new Unit(["s"], ["yr"])))),
            createNativeConversion([], '#min', "#s", (val: Measurement) => val.multiply(new Measurement(60, new Unit(["s"], ["min"])))),
            createNativeConversion([], '#h', "#s", (val: Measurement) => val.multiply(new Measurement(3600, new Unit(["s"], ["h"])))),
            createNativeConversion([], '#day', "#s", (val: Measurement) => val.multiply(new Measurement(86400, new Unit(["s"], ["day"])))),
            createNativeConversion([], '#wk', "#s", (val: Measurement) => val.multiply(new Measurement(604800, new Unit(["s"], ["wk"])))),
            createNativeConversion([], '#yr', "#s", (val: Measurement) => val.multiply(new Measurement(31449600, new Unit(["s"], ["yr"])))),

            // Distance
            createNativeConversion([], '#m', "#pm", (val: Measurement) => val.multiply(new Measurement(1000000000000, new Unit(["pm"], ["m"])))),
            createNativeConversion([], '#m', "#nm", (val: Measurement) => val.multiply(new Measurement(1000000000, new Unit(["nm"], ["m"])))),
            createNativeConversion([], '#m', "#µm", (val: Measurement) => val.multiply(new Measurement(1000000, new Unit(["µm"], ["m"])))),
            createNativeConversion([], '#m', "#mm", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["mm"], ["m"])))),
            createNativeConversion([], '#m', "#cm", (val: Measurement) => val.multiply(new Measurement(100, new Unit(["cm"], ["m"])))),
            createNativeConversion([], '#m', "#dm", (val: Measurement) => val.multiply(new Measurement(10, new Unit(["dm"], ["m"])))),
            createNativeConversion([], '#m', "#km", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["m"], ["km"])))),
            createNativeConversion([], '#m', "#Mm", (val: Measurement) => val.divide(new Measurement(1000000, new Unit(["m"], ["Mm"])))),
            createNativeConversion([], '#m', "#Gm", (val: Measurement) => val.divide(new Measurement(1000000000, new Unit(["m"], ["Gm"])))),
            createNativeConversion([], '#m', "#Tm", (val: Measurement) => val.divide(new Measurement(1000000000000, new Unit(["m"], ["Tm"])))),
            createNativeConversion([], '#pm', "#m", (val: Measurement) => val.divide(new Measurement(1000000000000, new Unit(["pm"], ["m"])))),
            createNativeConversion([], '#nm', "#m", (val: Measurement) => val.divide(new Measurement(1000000000, new Unit(["nm"], ["m"])))),
            createNativeConversion([], '#µm', "#m", (val: Measurement) => val.divide(new Measurement(1000000, new Unit(["µm"], ["m"])))),
            createNativeConversion([], '#mm', "#m", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["mm"], ["m"])))),
            createNativeConversion([], '#cm', "#m", (val: Measurement) => val.divide(new Measurement(100, new Unit(["cm"], ["m"])))),
            createNativeConversion([], '#dm', "#m", (val: Measurement) => val.divide(new Measurement(10, new Unit(["dm"], ["m"])))),
            createNativeConversion([], '#km', "#m", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["m"], ["km"])))),
            createNativeConversion([], '#Mm', "#m", (val: Measurement) => val.multiply(new Measurement(1000000, new Unit(["m"], ["Mm"])))),
            createNativeConversion([], '#Gm', "#m", (val: Measurement) => val.multiply(new Measurement(1000000000, new Unit(["m"], ["Gm"])))),
            createNativeConversion([], '#Tm', "#mT", (val: Measurement) => val.divide(new Measurement(1000000000000, new Unit(["m"], ["Tm"])))),

            // Imperial conversions
            createNativeConversion([], '#km', "#mi", (val: Measurement) => val.multiply(new Measurement(0.621371, new Unit(["mi"], ["km"])))),
            createNativeConversion([], '#mi', "#km", (val: Measurement) => val.divide(new Measurement(0.621371, new Unit(["mi"], ["km"])))),
            createNativeConversion([], '#cm', "#in", (val: Measurement) => val.multiply(new Measurement(0.393701, new Unit(["in"], ["cm"])))),
            createNativeConversion([], '#in', "#cm", (val: Measurement) => val.divide(new Measurement(0.393701, new Unit(["in"], ["cm"])))),
            createNativeConversion([], '#m', "#ft", (val: Measurement) => val.multiply(new Measurement(0.3048, new Unit(["ft"], ["km"])))),
            createNativeConversion([], '#ft', "#m", (val: Measurement) => val.divide(new Measurement(0.3048, new Unit(["ft"], ["km"])))),
            
            // Weight
            createNativeConversion([], '#g', "#mg", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["mg"], ["g"])))),
            createNativeConversion([], '#mg', "#g", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["mg"], ["g"])))),
            createNativeConversion([], '#g', "#kg", (val: Measurement) => val.divide(new Measurement(1000, new Unit(["g"], ["kg"])))),
            createNativeConversion([], '#kg', "#g", (val: Measurement) => val.multiply(new Measurement(1000, new Unit(["g"], ["kg"])))),
            createNativeConversion([], '#g', "#oz", (val: Measurement) => val.multiply(new Measurement(0.035274, new Unit(["oz"], ["g"])))),
            createNativeConversion([], '#oz', "#g", (val: Measurement) => val.divide(new Measurement(0.035274, new Unit(["oz"], ["g"])))),
            createNativeConversion([], '#oz', "#lb", (val: Measurement) => val.multiply(new Measurement(0.0625, new Unit(["lb"], ["oz"])))),
            createNativeConversion([], '#lb', "#oz", (val: Measurement) => val.divide(new Measurement(0.0625, new Unit(["lb"], ["oz"]))))

        ], false, true)
    );
    
}