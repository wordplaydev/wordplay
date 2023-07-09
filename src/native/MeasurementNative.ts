import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import MeasurementType from '@nodes/MeasurementType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import Bool from '@runtime/Bool';
import Measurement from '@runtime/Measurement';
import Text from '@runtime/Text';
import TypeException from '@runtime/TypeException';
import type Value from '@runtime/Value';
import { createNativeConversion } from './Native';
import NativeExpression from './NativeExpression';
import type Evaluation from '@runtime/Evaluation';
import List from '@runtime/List';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getFunctionLocales as getFunctionLocales } from '@locale/getFunctionLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';

export default function bootstrapMeasurement(locales: Locale[]) {
    const subtractNames = getNameLocales(
        locales,
        (t) => t.native.measurement.function.subtract.inputs[0].names
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
            requestor: Expression,
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
        expression: (
            requestor: Expression,
            left: Measurement
        ) => Value | undefined
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
        getDocLocales(locales, (t) => t.native.measurement.doc),
        getNameLocales(locales, (t) => t.native.measurement.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.add
                    ),
                    MeasurementType.make((left) => left),
                    // The output's type should be the left's type
                    MeasurementType.make((left) => left),
                    (requestor, left, right) => left.add(requestor, right)
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.function.subtract.doc
                    ),
                    getNameLocales(
                        locales,
                        (t) => t.native.measurement.function.subtract.name
                    ),
                    undefined,
                    [
                        // Optional operand, since negation and subtraction are overloaded.
                        Bind.make(
                            getDocLocales(
                                locales,
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
                    getFunctionLocales(
                        locales,
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
                    getFunctionLocales(
                        locales,
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
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.remainder
                    ),
                    MeasurementType.wildcard(),
                    MeasurementType.make((left) => left),
                    (requestor, left, right) =>
                        left.remainder(requestor, right),
                    false
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.truncate
                    ),
                    MeasurementType.wildcard(),
                    (requestor, left) => left.floor(requestor)
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.absolute
                    ),
                    MeasurementType.wildcard(),
                    (requestor, left) => left.absolute(requestor)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
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
                    getFunctionLocales(
                        locales,
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
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.lessThan
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) => left.lessThan(requestor, right)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.greaterThan
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        left.greaterThan(requestor, right)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
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
                    getFunctionLocales(
                        locales,
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
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.equal
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.notequal
                    ),
                    MeasurementType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),

                // Trigonometry
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.cos
                    ),
                    MeasurementType.make((unit) => unit),
                    (requestor, left) => left.cos(requestor)
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (t) => t.native.measurement.function.sin
                    ),
                    MeasurementType.make((unit) => unit),
                    (requestor, left) => left.sin(requestor)
                ),

                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.text
                    ),
                    '#?',
                    "''",
                    (requestor: Expression, val: Measurement) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.list
                    ),
                    '#',
                    '[]',
                    (requestor: Expression, val: Measurement) => {
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
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.s2m
                    ),
                    '#s',
                    '#min',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                60,
                                Unit.make(['s'], ['min'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.s2h
                    ),
                    '#s',
                    '#h',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                3600,
                                Unit.make(['s'], ['h'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.s2day
                    ),
                    '#s',
                    '#day',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                86400,
                                Unit.make(['s'], ['day'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.s2wk
                    ),
                    '#s',
                    '#wk',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                604800,
                                Unit.make(['s'], ['wk'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.s2year
                    ),
                    '#s',
                    '#yr',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                31449600,
                                Unit.make(['s'], ['yr'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.s2ms
                    ),
                    '#s',
                    '#ms',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['s'], ['ms'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.ms2s
                    ),
                    '#ms',
                    '#s',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['ms'], ['s'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.min2s
                    ),
                    '#min',
                    '#s',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                60,
                                Unit.make(['s'], ['min'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.h2s
                    ),
                    '#h',
                    '#s',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                3600,
                                Unit.make(['s'], ['h'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.day2s
                    ),
                    '#day',
                    '#s',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                86400,
                                Unit.make(['s'], ['day'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.wk2s
                    ),
                    '#wk',
                    '#s',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                604800,
                                Unit.make(['s'], ['wk'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.yr2s
                    ),
                    '#yr',
                    '#s',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                31449600,
                                Unit.make(['s'], ['yr'])
                            )
                        )
                ),

                // Distance
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2pm
                    ),
                    '#m',
                    '#pm',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.make(['pm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2nm
                    ),
                    '#m',
                    '#nm',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.make(['nm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2micro
                    ),
                    '#m',
                    '#µm',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.make(['µm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2mm
                    ),
                    '#m',
                    '#mm',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['mm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2cm
                    ),

                    '#m',
                    '#cm',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                100,
                                Unit.make(['cm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2dm
                    ),
                    '#m',
                    '#dm',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                10,
                                Unit.make(['dm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2km
                    ),
                    '#m',
                    '#km',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['m'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2Mm
                    ),
                    '#m',
                    '#Mm',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.make(['m'], ['Mm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2Gm
                    ),
                    '#m',
                    '#Gm',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.make(['m'], ['Gm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2Tm
                    ),
                    '#m',
                    '#Tm',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.make(['m'], ['Tm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.pm2m
                    ),
                    '#pm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.make(['pm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.nm2m
                    ),
                    '#nm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.make(['nm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.micro2m
                    ),
                    '#µm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.make(['µm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.mm2m
                    ),
                    '#mm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['mm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.cm2m
                    ),
                    '#cm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                100,
                                Unit.make(['cm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.dm2m
                    ),
                    '#dm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                10,
                                Unit.make(['dm'], ['m'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.km2m
                    ),
                    '#km',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['m'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.Mm2m
                    ),
                    '#Mm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000,
                                Unit.make(['m'], ['Mm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.Gm2m
                    ),
                    '#Gm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000,
                                Unit.make(['m'], ['Gm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.Tm2m
                    ),
                    '#Tm',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000000000000,
                                Unit.make(['m'], ['Tm'])
                            )
                        )
                ),

                // Imperial conversions
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.km2mi
                    ),
                    '#km',
                    '#mi',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.621371,
                                Unit.make(['mi'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.mi2km
                    ),
                    '#mi',
                    '#km',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.621371,
                                Unit.make(['mi'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.cm2in
                    ),
                    '#cm',
                    '#in',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.393701,
                                Unit.make(['in'], ['cm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.in2cm
                    ),
                    '#in',
                    '#cm',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.393701,
                                Unit.make(['in'], ['cm'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.m2ft
                    ),
                    '#m',
                    '#ft',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.3048,
                                Unit.make(['ft'], ['km'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.ft2m
                    ),
                    '#ft',
                    '#m',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.3048,
                                Unit.make(['ft'], ['km'])
                            )
                        )
                ),

                // Weight
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.g2mg
                    ),
                    '#g',
                    '#mg',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['mg'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.mg2g
                    ),
                    '#mg',
                    '#g',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['mg'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.g2kg
                    ),
                    '#g',
                    '#kg',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['g'], ['kg'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.kg2g
                    ),
                    '#kg',
                    '#g',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                1000,
                                Unit.make(['g'], ['kg'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.g2oz
                    ),
                    '#g',
                    '#oz',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.035274,
                                Unit.make(['oz'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.oz2g
                    ),
                    '#oz',
                    '#g',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.035274,
                                Unit.make(['oz'], ['g'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.oz2lb
                    ),
                    '#oz',
                    '#lb',
                    (requestor: Expression, val: Measurement) =>
                        val.multiply(
                            requestor,
                            new Measurement(
                                requestor,
                                0.0625,
                                Unit.make(['lb'], ['oz'])
                            )
                        )
                ),
                createNativeConversion(
                    getDocLocales(
                        locales,
                        (t) => t.native.measurement.conversion.lb2oz
                    ),
                    '#lb',
                    '#oz',
                    (requestor: Expression, val: Measurement) =>
                        val.divide(
                            requestor,
                            new Measurement(
                                requestor,
                                0.0625,
                                Unit.make(['lb'], ['oz'])
                            )
                        )
                ),
            ],
            BlockKind.Creator
        )
    );
}
