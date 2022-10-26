import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import MeasurementType from "../nodes/MeasurementType";
import NoneLiteral from "../nodes/NoneLiteral";
import NoneType from "../nodes/NoneType";
import StructureDefinition from "../nodes/StructureDefinition";
import type Translations from "../nodes/Translations";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import type Type from "../nodes/Type";
import UnionType from "../nodes/UnionType";
import Unit from "../nodes/Unit";
import { PRODUCT_SYMBOL } from "../parser/Tokenizer";
import Bool from "../runtime/Bool";
import Measurement from "../runtime/Measurement";
import Text from "../runtime/Text";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import { createNativeConversion } from "./NativeBindings";
import NativeExpression from "./NativeExpression";

export default function bootstrapMeasurement() {

    function createBinaryOp(docs: Translations, names: Translations, inputDocs: Translations, inputType: Type, outputType: Type, expression: (left: Measurement, right: Measurement) => Value | undefined, requireEqualUnits: boolean=true) {
        return new FunctionDefinition(
            docs, names, [],
            [ new Bind(
                inputDocs, 
                {
                    eng: "number",
                    "😀": TRANSLATE
                }, 
                inputType
            ) ],
            new NativeExpression(
                new MeasurementType(),
                evaluation => {
                    const left = evaluation.getContext();
                    const right = evaluation.resolve("number");
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if(!(left instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), left);
                    if(!(right instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                    if(requireEqualUnits && !left.unit.isEqualTo(right.unit)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                    return expression(left, right) ?? new TypeException(evaluation.getEvaluator(), left.getType(), right);
                },
                { 
                    "😀": TRANSLATE,
                    eng: "Native measurement operation." 
                }
            ),
            outputType
        );
    }
    
    function createUnaryOp(docs: Translations, names: Translations, outputType: Type, expression: (operand: Measurement) => Value | undefined) {
        return new FunctionDefinition(
            docs, names, [], [],
            new NativeExpression(
                new MeasurementType(),
                evaluation => {
                    const value = evaluation.getContext();
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if(!(value instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), value);
                    return expression(value) ?? new TypeException(evaluation.getEvaluator(), value.getType(), value);
                },
                { 
                    "😀": TRANSLATE,
                    eng: "Native measurement operation." 
                }
            ),
            outputType
        );    
    }

    return new StructureDefinition(
        WRITE_DOCS, 
        {
            eng: "number",
            "😀": "#"
        }, 
        [], [], [],
        new Block([
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "add",
                    "😀": "+"
                },
                WRITE_DOCS,
                // The operand's type should be the left's type.
                new MeasurementType(undefined, left => left), 
                // The output's type should be the left's type
                new MeasurementType(undefined, left => left),
                (left, right) => left.add(right)
            ),
            new FunctionDefinition(
                WRITE_DOCS, 
                {
                    eng: "subtract",
                    "😀": "-"
                },
                [],
                [ 
                    // Optional operand, since negation and subtraction are overloaded.
                    new Bind(
                        WRITE_DOCS,
                        {
                            eng: "number",
                            "😀": TRANSLATE
                        }, 
                        new UnionType(
                            new NoneType(),
                            new MeasurementType(undefined, left => left)), 
                        new NoneLiteral()
                    ) 
                ],
                new NativeExpression(
                    new MeasurementType(),
                    evaluation => {
                        const left = evaluation.getContext();
                        const right = evaluation.resolve("number");
                        // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                        if(!(left instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), left);
                        if(right !== undefined && !(right instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                        return right === undefined ? left.negate() : left.subtract(right);
                    },
                    { 
                        "😀": TRANSLATE,
                        eng: "Native measurement operation." 
                    }
                ),
                new MeasurementType(undefined, left => left)
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "multiply",
                    "😀": PRODUCT_SYMBOL
                },
                WRITE_DOCS,
                // The operand's type can be any unitless measurement
                new MeasurementType(),
                // The output's type is is the unit's product
                new MeasurementType(undefined, (left, right) => left.product(right)),
                (left, right) => left.multiply(right),
                false
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "divide",
                    "😀": "÷"
                },
                WRITE_DOCS,
                new MeasurementType(), 
                new MeasurementType(undefined, (left, right) => left.quotient(right)),
                (left, right) => left.divide(right),
                false
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "remainder",
                    "😀": "%"
                },
                WRITE_DOCS,
                new MeasurementType(),
                new MeasurementType(undefined, left => left),
                (left, right) => left.remainder(right),
                false
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "power",
                    "😀": "^"
                },
                WRITE_DOCS,
                new MeasurementType(), 
                new MeasurementType(undefined, (left, right, constant) => right === right && constant === undefined ? new Unit() : left.power(constant)),
                (left, right) => left.power(right),
                false
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "less-than",
                    "😀": "<"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (left, right) => left.lessThan(right)
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "greater-than",
                    "😀": ">"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (left, right) => left.greaterThan(right)
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "less-than-or-equal",
                    "😀": "≤"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (left, right) => new Bool(left.lessThan(right).bool || left.isEqualTo(right))
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "greater-than-or-equal",
                    "😀": "≥"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (left, right) => new Bool(left.greaterThan(right).bool || left.isEqualTo(right))
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "equals",
                    "😀": "="
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (left, right) => new Bool(left.isEqualTo(right))
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "not-equal",
                    "😀": "≠"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (left, right) => new Bool(!left.isEqualTo(right))
            ),
            createUnaryOp(
                WRITE_DOCS,
                {
                    eng: "square-root",
                    "😀": "√"
                },
                new MeasurementType(undefined, unit => unit.sqrt()), 
                operand => operand.sqrt()
            ),
        
            createNativeConversion(WRITE_DOCS, '#', "''", (val: Measurement) => new Text(val.toString())),

            // Time
            createNativeConversion(WRITE_DOCS, '#s', "#min", (val: Measurement) => val.divide(new Measurement(60, Unit.unit(["s"], ["min"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#h", (val: Measurement) => val.divide(new Measurement(3600, Unit.unit(["s"], ["h"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#day", (val: Measurement) => val.divide(new Measurement(86400, Unit.unit(["s"], ["day"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#wk", (val: Measurement) => val.divide(new Measurement(604800, Unit.unit(["s"], ["wk"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#yr", (val: Measurement) => val.divide(new Measurement(31449600, Unit.unit(["s"], ["yr"])))),
            createNativeConversion(WRITE_DOCS, '#min', "#s", (val: Measurement) => val.multiply(new Measurement(60, Unit.unit(["s"], ["min"])))),
            createNativeConversion(WRITE_DOCS, '#h', "#s", (val: Measurement) => val.multiply(new Measurement(3600, Unit.unit(["s"], ["h"])))),
            createNativeConversion(WRITE_DOCS, '#day', "#s", (val: Measurement) => val.multiply(new Measurement(86400, Unit.unit(["s"], ["day"])))),
            createNativeConversion(WRITE_DOCS, '#wk', "#s", (val: Measurement) => val.multiply(new Measurement(604800, Unit.unit(["s"], ["wk"])))),
            createNativeConversion(WRITE_DOCS, '#yr', "#s", (val: Measurement) => val.multiply(new Measurement(31449600, Unit.unit(["s"], ["yr"])))),

            // Distance
            createNativeConversion(WRITE_DOCS, '#m', "#pm", (val: Measurement) => val.multiply(new Measurement(1000000000000, Unit.unit(["pm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#nm", (val: Measurement) => val.multiply(new Measurement(1000000000, Unit.unit(["nm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#µm", (val: Measurement) => val.multiply(new Measurement(1000000, Unit.unit(["µm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#mm", (val: Measurement) => val.multiply(new Measurement(1000, Unit.unit(["mm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#cm", (val: Measurement) => val.multiply(new Measurement(100, Unit.unit(["cm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#dm", (val: Measurement) => val.multiply(new Measurement(10, Unit.unit(["dm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#km", (val: Measurement) => val.divide(new Measurement(1000, Unit.unit(["m"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#Mm", (val: Measurement) => val.divide(new Measurement(1000000, Unit.unit(["m"], ["Mm"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#Gm", (val: Measurement) => val.divide(new Measurement(1000000000, Unit.unit(["m"], ["Gm"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#Tm", (val: Measurement) => val.divide(new Measurement(1000000000000, Unit.unit(["m"], ["Tm"])))),
            createNativeConversion(WRITE_DOCS, '#pm', "#m", (val: Measurement) => val.divide(new Measurement(1000000000000, Unit.unit(["pm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#nm', "#m", (val: Measurement) => val.divide(new Measurement(1000000000, Unit.unit(["nm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#µm', "#m", (val: Measurement) => val.divide(new Measurement(1000000, Unit.unit(["µm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#mm', "#m", (val: Measurement) => val.divide(new Measurement(1000, Unit.unit(["mm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#cm', "#m", (val: Measurement) => val.divide(new Measurement(100, Unit.unit(["cm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#dm', "#m", (val: Measurement) => val.divide(new Measurement(10, Unit.unit(["dm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#km', "#m", (val: Measurement) => val.multiply(new Measurement(1000, Unit.unit(["m"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#Mm', "#m", (val: Measurement) => val.multiply(new Measurement(1000000, Unit.unit(["m"], ["Mm"])))),
            createNativeConversion(WRITE_DOCS, '#Gm', "#m", (val: Measurement) => val.multiply(new Measurement(1000000000, Unit.unit(["m"], ["Gm"])))),
            createNativeConversion(WRITE_DOCS, '#Tm', "#mT", (val: Measurement) => val.divide(new Measurement(1000000000000, Unit.unit(["m"], ["Tm"])))),

            // Imperial conversions
            createNativeConversion(WRITE_DOCS, '#km', "#mi", (val: Measurement) => val.multiply(new Measurement(0.621371, Unit.unit(["mi"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#mi', "#km", (val: Measurement) => val.divide(new Measurement(0.621371, Unit.unit(["mi"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#cm', "#in", (val: Measurement) => val.multiply(new Measurement(0.393701, Unit.unit(["in"], ["cm"])))),
            createNativeConversion(WRITE_DOCS, '#in', "#cm", (val: Measurement) => val.divide(new Measurement(0.393701, Unit.unit(["in"], ["cm"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#ft", (val: Measurement) => val.multiply(new Measurement(0.3048, Unit.unit(["ft"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#ft', "#m", (val: Measurement) => val.divide(new Measurement(0.3048, Unit.unit(["ft"], ["km"])))),
            
            // Weight
            createNativeConversion(WRITE_DOCS, '#g', "#mg", (val: Measurement) => val.multiply(new Measurement(1000, Unit.unit(["mg"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#mg', "#g", (val: Measurement) => val.divide(new Measurement(1000, Unit.unit(["mg"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#g', "#kg", (val: Measurement) => val.divide(new Measurement(1000, Unit.unit(["g"], ["kg"])))),
            createNativeConversion(WRITE_DOCS, '#kg', "#g", (val: Measurement) => val.multiply(new Measurement(1000, Unit.unit(["g"], ["kg"])))),
            createNativeConversion(WRITE_DOCS, '#g', "#oz", (val: Measurement) => val.multiply(new Measurement(0.035274, Unit.unit(["oz"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#oz', "#g", (val: Measurement) => val.divide(new Measurement(0.035274, Unit.unit(["oz"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#oz', "#lb", (val: Measurement) => val.multiply(new Measurement(0.0625, Unit.unit(["lb"], ["oz"])))),
            createNativeConversion(WRITE_DOCS, '#lb', "#oz", (val: Measurement) => val.divide(new Measurement(0.0625, Unit.unit(["lb"], ["oz"]))))

        ], false, true)
    );
    
}