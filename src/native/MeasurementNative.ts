import Bind from '../nodes/Bind';
import Block from '../nodes/Block';
import BooleanType from '../nodes/BooleanType';
import FunctionDefinition from '../nodes/FunctionDefinition';
import MeasurementType from '../nodes/MeasurementType';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneType from '../nodes/NoneType';
import StructureDefinition from '../nodes/StructureDefinition';
import type Type from '../nodes/Type';
import UnionType from '../nodes/UnionType';
import Unit from '../nodes/Unit';
import Bool from '../runtime/Bool';
import Measurement from '../runtime/Measurement';
import Text from '../runtime/Text';
import TypeException from '../runtime/TypeException';
import type Value from '../runtime/Value';
import { createNativeConversion } from './NativeBindings';
import NativeExpression from './NativeExpression';
import type Node from '../nodes/Node';
import type Evaluation from '../runtime/Evaluation';
import List from '../runtime/List';
import type Docs from '../nodes/Docs';
import type Names from '../nodes/Names';
import { getFunctionTranslations } from '../translations/getFunctionTranslations';
import { getDocTranslations } from '../translations/getDocTranslations';
import { getNameTranslations } from '../translations/getNameTranslations';

export default function bootstrapMeasurement() {
    const subtractNames = getNameTranslations(
        (t) => t.native.measurement.function.subtract.inputs[0].name
    );

    function createBinaryOp(
        translations: {
            docs: Docs;
            names: Names;
            inputs: { docs: Docs; names: Names }[];
        },
        inputType: Type,
        outputType: Type,
        expression: (
            requestor: Node,
            left: Measurement,
            right: Measurement
        ) => Value | undefined,
        requireEqualUnits: boolean = true
    ) {
        return FunctionDefinition.make(
            translations.docs,
            translations.names,
            undefined,
            translations.inputs.map((i) =>
                Bind.make(i.docs, i.names, inputType)
            ),
            new NativeExpression(
                MeasurementType.make(),
                (requestor, evaluation) => {
                    const left: Value | Evaluation | undefined =
                        evaluation.getClosure();
                    const right = evaluation.resolve(
                        translations.inputs[0].names
                    );
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if (!(left instanceof Measurement))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            MeasurementType.make(),
                            left
                        );

                    if (!(right instanceof Measurement))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            MeasurementType.make(),
                            right
                        );
                    if (requireEqualUnits && !left.unit.isEqualTo(right.unit))
                        return new TypeException(
                            evaluation.getEvaluator(),
                            left.getType(),
                            right
                        );
                    return (
                        expression(requestor, left, right) ??
                        new TypeException(
                            evaluation.getEvaluator(),
                            left.getType(),
                            right
                        )
                    );
                }
            ),
            outputType
        );
    }

    function createUnaryOp(
        translations: {
            docs: Docs;
            names: Names;
            inputs: { docs: Docs; names: Names }[];
        },
        outputType: Type,
        expression: (requestor: Node, left: Measurement) => Value | undefined
    ) {
        return FunctionDefinition.make(
            translations.docs,
            translations.names,
            undefined,
            [],
            new NativeExpression(
                MeasurementType.make(),
                (requestor, evaluation) => {
                    const left: Value | Evaluation | undefined =
                        evaluation.getClosure();
                    // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                    if (!(left instanceof Measurement))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            MeasurementType.make(),
                            left
                        );
                    return (
                        expression(requestor, left) ??
                        evaluation.getValueOrTypeException(
                            requestor,
                            MeasurementType.make(),
                            undefined
                        )
                    );
                }
            ),
            outputType
        );
    }

    return StructureDefinition.make(
        getDocTranslations((t) => t.native.measurement.doc),
        getNameTranslations((t) => t.native.measurement.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.add
                    ),
                    MeasurementType.make((left) => left),
                    // The output's type should be the left's type
                    MeasurementType.make((left) => left),
                    (requestor, left, right) => left.add(requestor, right)
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.measurement.function.subtract.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.measurement.function.subtract.name
                    ),
                    undefined,
                    [
                        // Optional operand, since negation and subtraction are overloaded.
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.measurement.function.subtract
                                        .inputs[0].doc
                            ),
                            subtractNames,
                            UnionType.make(
                                NoneType.None,
                                MeasurementType.make((left) => left)
                            ),
                            NoneLiteral.make()
                        ),
                    ],
                    new NativeExpression(
                        MeasurementType.make(),
                        (requestor, evaluation) => {
                            const left = evaluation.getClosure();
                            const right = evaluation.resolve(subtractNames);
                            // It should be impossible for the left to be a Measurement, but the type system doesn't know it.
                            if (!(left instanceof Measurement))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    MeasurementType.make(),
                                    left
                                );
                            if (
                                right !== undefined &&
                                !(right instanceof Measurement)
                            )
                                return new TypeException(
                                    evaluation.getEvaluator(),
                                    left.getType(),
                                    right
                                );
                            return right === undefined
                                ? left.negate(requestor)
                                : left.subtract(requestor, right);
                        }
                    ),
                    MeasurementType.make((left) => left)
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.multiply
                    ),
                    // The operand's type can be any unitless measurement
                    MeasurementType.wildcard(),
                    // The output's type is is the unit's product
                    MeasurementType.make((left, right) =>
                        right ? left.product(right) : left
                    ),
                    (requestor, left, right) => left.multiply(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.divide
                    ),
                    MeasurementType.wildcard(),
                    MeasurementType.make((left, right) =>
                        right ? left.quotient(right) : left
                    ),
                    (requestor, left, right) => left.divide(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.remainder
                    ),
                    MeasurementType.wildcard(),
                    MeasurementType.make((left) => left),
                    (requestor, left, right) =>
                        left.remainder(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.power
                    ),
                    MeasurementType.wildcard(),
                    MeasurementType.make((left, right, constant) => {
                        right;
                        return constant === undefined
                            ? Unit.Empty
                            : left.power(constant);
                    }),
                    (requestor, left, right) => left.power(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.root
                    ),
                    MeasurementType.wildcard(),
                    MeasurementType.make((left, right, constant) => {
                        right;
                        return constant === undefined
                            ? Unit.Empty
                            : left.root(constant);
                    }),
                    (requestor, left, right) => left.root(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.lessThan
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) => left.lessThan(requestor, right)
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.greaterThan
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        left.greaterThan(requestor, right)
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.lessOrEqual
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(
                            requestor,
                            left.lessThan(requestor, right).bool ||
                                left.isEqualTo(right)
                        )
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.greaterOrEqual
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(
                            requestor,
                            left.greaterThan(requestor, right).bool ||
                                left.isEqualTo(right)
                        )
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.equal
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createBinaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.notequal
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),

                // Trigonometry
                createUnaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.cos
                    ),
                    MeasurementType.make((unit) => unit),
                    (requestor, left) => left.cos(requestor)
                ),
                createUnaryOp(
                    getFunctionTranslations(
                        (t) => t.native.measurement.function.sin
                    ),
                    MeasurementType.make((unit) => unit),
                    (requestor, left) => left.sin(requestor)
                ),

                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.text
                    ),
                    '#?',
                    "''",
                    (requestor: Node, val: Measurement) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.text
                    ),
                    '#',
                    '[]',
                    (requestor: Node, val: Measurement) => {
                        const list = [];
                        const max = val.toNumber();
                        if (max < 0) return new List(requestor, []);
                        for (let i = 1; i <= val.toNumber(); i++)
                            list.push(new Measurement(requestor, i));
                        return new List(requestor, list);
                    }
                ),

                // Time
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.s2m
                    ),
                    '#s',
                    '#min',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                60,
                                Unit.unit(['s'], ['min'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.s2h
                    ),
                    '#s',
                    '#h',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                3600,
                                Unit.unit(['s'], ['h'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.s2day
                    ),
                    '#s',
                    '#day',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                86400,
                                Unit.unit(['s'], ['day'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.s2wk
                    ),
                    '#s',
                    '#wk',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                604800,
                                Unit.unit(['s'], ['wk'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.s2year
                    ),
                    '#s',
                    '#yr',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                31449600,
                                Unit.unit(['s'], ['yr'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.s2ms
                    ),
                    '#s',
                    '#ms',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['s'], ['ms'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.ms2s
                    ),
                    '#ms',
                    '#s',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['ms'], ['s'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.min2s
                    ),
                    '#min',
                    '#s',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                60,
                                Unit.unit(['s'], ['min'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.h2s
                    ),
                    '#h',
                    '#s',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                3600,
                                Unit.unit(['s'], ['h'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.day2s
                    ),
                    '#day',
                    '#s',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                86400,
                                Unit.unit(['s'], ['day'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.wk2s
                    ),
                    '#wk',
                    '#s',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                604800,
                                Unit.unit(['s'], ['wk'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.yr2s
                    ),
                    '#yr',
                    '#s',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                31449600,
                                Unit.unit(['s'], ['yr'])
                            )
                        )
                ),

                // Distance
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2pm
                    ),
                    '#m',
                    '#pm',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.unit(['pm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2nm
                    ),
                    '#m',
                    '#nm',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.unit(['nm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2micro
                    ),
                    '#m',
                    '#µm',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.unit(['µm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2mm
                    ),
                    '#m',
                    '#mm',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['mm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2cm
                    ),

                    '#m',
                    '#cm',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                100,
                                Unit.unit(['cm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2dm
                    ),
                    '#m',
                    '#dm',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                10,
                                Unit.unit(['dm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2km
                    ),
                    '#m',
                    '#km',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['m'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2Mm
                    ),
                    '#m',
                    '#Mm',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.unit(['m'], ['Mm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2Gm
                    ),
                    '#m',
                    '#Gm',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.unit(['m'], ['Gm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2Tm
                    ),
                    '#m',
                    '#Tm',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.unit(['m'], ['Tm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.pm2m
                    ),
                    '#pm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.unit(['pm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.nm2m
                    ),
                    '#nm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.unit(['nm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.micro2m
                    ),
                    '#µm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.unit(['µm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.mm2m
                    ),
                    '#mm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['mm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.cm2m
                    ),
                    '#cm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                100,
                                Unit.unit(['cm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.dm2m
                    ),
                    '#dm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                10,
                                Unit.unit(['dm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.km2m
                    ),
                    '#km',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['m'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.Mm2m
                    ),
                    '#Mm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.unit(['m'], ['Mm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.Gm2m
                    ),
                    '#Gm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.unit(['m'], ['Gm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.Tm2m
                    ),
                    '#Tm',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.unit(['m'], ['Tm'])
                            )
                        )
                ),

                // Imperial conversions
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.km2mi
                    ),
                    '#km',
                    '#mi',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.621371,
                                Unit.unit(['mi'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.mi2km
                    ),
                    '#mi',
                    '#km',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.621371,
                                Unit.unit(['mi'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.cm2in
                    ),
                    '#cm',
                    '#in',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.393701,
                                Unit.unit(['in'], ['cm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.in2cm
                    ),
                    '#in',
                    '#cm',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.393701,
                                Unit.unit(['in'], ['cm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.m2ft
                    ),
                    '#m',
                    '#ft',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.3048,
                                Unit.unit(['ft'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.ft2m
                    ),
                    '#ft',
                    '#m',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.3048,
                                Unit.unit(['ft'], ['km'])
                            )
                        )
                ),

                // Weight
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.g2mg
                    ),
                    '#g',
                    '#mg',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['mg'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.mg2g
                    ),
                    '#mg',
                    '#g',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['mg'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.g2kg
                    ),
                    '#g',
                    '#kg',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['g'], ['kg'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.kg2g
                    ),
                    '#kg',
                    '#g',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.unit(['g'], ['kg'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.g2oz
                    ),
                    '#g',
                    '#oz',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.035274,
                                Unit.unit(['oz'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.oz2g
                    ),
                    '#oz',
                    '#g',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.035274,
                                Unit.unit(['oz'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.oz2lb
                    ),
                    '#oz',
                    '#lb',
                    (requestor: Node, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.0625,
                                Unit.unit(['lb'], ['oz'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocTranslations(
                        (t) => t.native.measurement.conversion.lb2oz
                    ),
                    '#lb',
                    '#oz',
                    (requestor: Node, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.0625,
                                Unit.unit(['lb'], ['oz'])
                            )
                        )
                ),
            ],
            false,
            true
        )
    );
}
