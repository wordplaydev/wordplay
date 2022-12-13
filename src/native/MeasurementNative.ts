import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import MeasurementType from "../nodes/MeasurementType";
import NoneLiteral from "../nodes/NoneLiteral";
import NoneType from "../nodes/NoneType";
import StructureDefinition from "../nodes/StructureDefinition";
import type Translations from "../nodes/Translations";
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";
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
import type Node from "../nodes/Node";
import type Evaluation from "../runtime/Evaluation";
import List from "../runtime/List";

export default function bootstrapMeasurement() {

    function createBinaryOp(docs: Translations, names: Translations, inputDocs: Translations, inputType: Type, outputType: Type, expression: (requestor: Node, left: Measurement, right: Measurement) => Value | undefined, requireEqualUnits: boolean=true) {
        return new FunctionDefinition(
            docs, names, [],
            [ new Bind(
                inputDocs, 
                {
                    eng: "number",
                    "😀": `${TRANSLATE}number`
                }, 
                inputType
            ) ],
            new NativeExpression(
                new MeasurementType(),
                (requestor, evaluation) => {
                    const left: Value | Evaluation | undefined = evaluation.getClosure();
                    const right = evaluation.resolve("number");
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if(!(left instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), left);
                    if(!(right instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                    if(requireEqualUnits && !left.unit.isEqualTo(right.unit)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                    return expression(requestor, left, right) ?? new TypeException(evaluation.getEvaluator(), left.getType(), right);
                },
                { 
                    "😀": WRITE,
                    eng: "Native measurement operation." 
                }
            ),
            outputType
        );
    }

    function createUnaryOp(docs: Translations, names: Translations, outputType: Type, expression: (requestor: Node, left: Measurement) => Value | undefined) {
        return new FunctionDefinition(
            docs, names, [],
            [],
            new NativeExpression(
                new MeasurementType(),
                (requestor, evaluation) => {
                    const left: Value | Evaluation | undefined = evaluation.getClosure();
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if(!(left instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), left);
                    return expression(requestor, left) ?? new TypeException(evaluation.getEvaluator(), left.getType(), undefined);
                },
                { 
                    "😀": WRITE,
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
                // The operand's unit should match the left's unit.
                new MeasurementType(undefined, left => left), 
                // The output's type should be the left's type
                new MeasurementType(undefined, left => left),
                (requestor, left, right) => left.add(requestor, right)
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
                            "😀": `${TRANSLATE}1`
                        }, 
                        new UnionType(
                            new NoneType(),
                            new MeasurementType(undefined, left => left)), 
                        new NoneLiteral()
                    ) 
                ],
                new NativeExpression(
                    new MeasurementType(),
                    (requestor, evaluation) => {
                        const left = evaluation.getClosure();
                        const right = evaluation.resolve("number");
                        // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                        if(!(left instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), new MeasurementType(), left);
                        if(right !== undefined && !(right instanceof Measurement)) return new TypeException(evaluation.getEvaluator(), left.getType(), right);
                        return right === undefined ? left.negate(requestor) : left.subtract(requestor, right);
                    },
                    { 
                        "😀": WRITE,
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
                new MeasurementType(undefined, (left, right) => right ? left.product(right) : left),
                (requestor, left, right) => left.multiply(requestor, right),
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
                new MeasurementType(undefined, (left, right) => right ? left.quotient(right) : left),
                (requestor, left, right) => left.divide(requestor, right),
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
                (requestor, left, right) => left.remainder(requestor, right),
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
                new MeasurementType(undefined, (left, right, constant) => { right; return constant === undefined ? new Unit() : left.power(constant); }),
                (requestor, left, right) => left.power(requestor, right),
                false
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "root",
                    "😀": "√"
                },
                WRITE_DOCS,
                new MeasurementType(),
                new MeasurementType(undefined, (left, right, constant) => { right; return constant === undefined ? new Unit() : left.root(constant) }),
                (requestor, left, right) => left.root(requestor, right),
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
                (requestor, left, right) => left.lessThan(requestor, right)
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "greater-than",
                    "😀": ">"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (requestor, left, right) => left.greaterThan(requestor, right)
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "less-than-or-equal",
                    "😀": "≤"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (requestor, left, right) => new Bool(requestor, left.lessThan(requestor, right).bool || left.isEqualTo(right))
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "greater-than-or-equal",
                    "😀": "≥"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (requestor, left, right) => new Bool(requestor, left.greaterThan(requestor, right).bool || left.isEqualTo(right))
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "equals",
                    "😀": "="
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), 
                new BooleanType(),
                (requestor, left, right) => new Bool(requestor, left.isEqualTo(right))
            ),
            createBinaryOp(
                WRITE_DOCS,
                {
                    eng: "not-equal",
                    "😀": "≠"
                },
                WRITE_DOCS,
                new MeasurementType(undefined, unit => unit), new BooleanType(),
                (requestor, left, right) => new Bool(requestor, !left.isEqualTo(right))
            ),
            
            // Trigonometry
            createUnaryOp(
                WRITE_DOCS,
                {
                    eng: "cos",
                    "😀": `${WRITE_DOCS}cos`
                },
                new MeasurementType(undefined, unit => unit),
                (requestor, left) => left.cos(requestor)
            ),
            createUnaryOp(
                WRITE_DOCS,
                {
                    eng: "sin",
                    "😀": `${WRITE_DOCS}sin`
                },
                new MeasurementType(undefined, unit => unit),
                (requestor, left) => left.sin(requestor)
            ),
            
            createNativeConversion(WRITE_DOCS, '#', "''", (requestor: Node, val: Measurement) => new Text(requestor, val.toString())),
            createNativeConversion(WRITE_DOCS, '#', "[]", (requestor: Node, val: Measurement) => {
                const list = [];
                const max = val.toNumber();
                if(max < 0) return new List(requestor, []);
                for(let i = 1; i <= val.toNumber(); i++)
                    list.push(new Measurement(requestor, i));
                return new List(requestor, list);
            }),


            // Time
            createNativeConversion(WRITE_DOCS, '#s', "#min", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 60, Unit.unit(["s"], ["min"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#h", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 3600, Unit.unit(["s"], ["h"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#day", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 86400, Unit.unit(["s"], ["day"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#wk", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 604800, Unit.unit(["s"], ["wk"])))),
            createNativeConversion(WRITE_DOCS, '#s', "#yr", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 31449600, Unit.unit(["s"], ["yr"])))),
            createNativeConversion(WRITE_DOCS, '#min', "#s", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 60, Unit.unit(["s"], ["min"])))),
            createNativeConversion(WRITE_DOCS, '#h', "#s", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 3600, Unit.unit(["s"], ["h"])))),
            createNativeConversion(WRITE_DOCS, '#day', "#s", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 86400, Unit.unit(["s"], ["day"])))),
            createNativeConversion(WRITE_DOCS, '#wk', "#s", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 604800, Unit.unit(["s"], ["wk"])))),
            createNativeConversion(WRITE_DOCS, '#yr', "#s", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 31449600, Unit.unit(["s"], ["yr"])))),

            // Distance
            createNativeConversion(WRITE_DOCS, '#m', "#pm", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000000000000, Unit.unit(["pm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#nm", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000000000, Unit.unit(["nm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#µm", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000000, Unit.unit(["µm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#mm", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000, Unit.unit(["mm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#cm", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 100, Unit.unit(["cm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#dm", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 10, Unit.unit(["dm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#km", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000, Unit.unit(["m"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#Mm", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000, Unit.unit(["m"], ["Mm"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#Gm", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000000, Unit.unit(["m"], ["Gm"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#Tm", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000000000, Unit.unit(["m"], ["Tm"])))),
            createNativeConversion(WRITE_DOCS, '#pm', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000000000, Unit.unit(["pm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#nm', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000000, Unit.unit(["nm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#µm', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000, Unit.unit(["µm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#mm', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000, Unit.unit(["mm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#cm', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 100, Unit.unit(["cm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#dm', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 10, Unit.unit(["dm"], ["m"])))),
            createNativeConversion(WRITE_DOCS, '#km', "#m", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000, Unit.unit(["m"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#Mm', "#m", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000000, Unit.unit(["m"], ["Mm"])))),
            createNativeConversion(WRITE_DOCS, '#Gm', "#m", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000000000, Unit.unit(["m"], ["Gm"])))),
            createNativeConversion(WRITE_DOCS, '#Tm', "#mT", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000000000000, Unit.unit(["m"], ["Tm"])))),

            // Imperial conversions
            createNativeConversion(WRITE_DOCS, '#km', "#mi", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 0.621371, Unit.unit(["mi"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#mi', "#km", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 0.621371, Unit.unit(["mi"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#cm', "#in", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 0.393701, Unit.unit(["in"], ["cm"])))),
            createNativeConversion(WRITE_DOCS, '#in', "#cm", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 0.393701, Unit.unit(["in"], ["cm"])))),
            createNativeConversion(WRITE_DOCS, '#m', "#ft", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 0.3048, Unit.unit(["ft"], ["km"])))),
            createNativeConversion(WRITE_DOCS, '#ft', "#m", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 0.3048, Unit.unit(["ft"], ["km"])))),
            
            // Weight
            createNativeConversion(WRITE_DOCS, '#g', "#mg", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000, Unit.unit(["mg"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#mg', "#g", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000, Unit.unit(["mg"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#g', "#kg", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 1000, Unit.unit(["g"], ["kg"])))),
            createNativeConversion(WRITE_DOCS, '#kg', "#g", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 1000, Unit.unit(["g"], ["kg"])))),
            createNativeConversion(WRITE_DOCS, '#g', "#oz", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 0.035274, Unit.unit(["oz"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#oz', "#g", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 0.035274, Unit.unit(["oz"], ["g"])))),
            createNativeConversion(WRITE_DOCS, '#oz', "#lb", (requestor: Node, val: Measurement) => val.multiply(requestor, new Measurement(requestor, 0.0625, Unit.unit(["lb"], ["oz"])))),
            createNativeConversion(WRITE_DOCS, '#lb', "#oz", (requestor: Node, val: Measurement) => val.divide(requestor, new Measurement(requestor, 0.0625, Unit.unit(["lb"], ["oz"]))))

        ], false, true)
    );
    
}