import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NumberType from '@nodes/NumberType';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import Bool from '@runtime/Bool';
import Number from '@runtime/Number';
import Text from '@runtime/Text';
import TypeException from '@runtime/TypeException';
import type Value from '@runtime/Value';
import { createBasisConversion } from './Basis';
import BasisExpression from './BasisExpression';
import type Evaluation from '@runtime/Evaluation';
import List from '@runtime/List';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getFunctionLocales as getFunctionLocales } from '@locale/getFunctionLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';

export default function bootstrapNumber(locales: Locale[]) {
    const subtractNames = getNameLocales(
        locales,
        (locale) => locale.basis.Number.function.subtract.inputs[0].names
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
            left: Number,
            right: Number
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
            new BasisExpression(outputType, (requestor, evaluation) => {
                const left: Value | Evaluation | undefined =
                    evaluation.getClosure();
                const right = evaluation.resolve(translations.inputs[0].names);
                // It should be impossible for the left to be a Number, but the type system doesn't know it.
                if (!(left instanceof Number))
                    return evaluation.getValueOrTypeException(
                        evaluation.getDefinition(),
                        NumberType.make(),
                        left
                    );

                if (!(right instanceof Number))
                    return evaluation.getValueOrTypeException(
                        evaluation.getDefinition(),
                        NumberType.make(),
                        right
                    );
                if (requireEqualUnits && !left.unit.isEqualTo(right.unit))
                    return new TypeException(
                        evaluation.getDefinition(),
                        evaluation.getEvaluator(),
                        left.getType(),
                        right
                    );
                return (
                    expression(requestor, left, right) ??
                    new TypeException(
                        evaluation.getDefinition(),
                        evaluation.getEvaluator(),
                        left.getType(),
                        right
                    )
                );
            }),
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
        expression: (requestor: Expression, left: Number) => Value | undefined
    ) {
        return FunctionDefinition.make(
            translations.docs,
            translations.names,
            undefined,
            [],
            new BasisExpression(NumberType.make(), (requestor, evaluation) => {
                const left: Value | Evaluation | undefined =
                    evaluation.getClosure();
                // It should be impossible for the left to be a Number, but the type system doesn't know it.
                if (!(left instanceof Number))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NumberType.make(),
                        left
                    );
                return (
                    expression(requestor, left) ??
                    evaluation.getValueOrTypeException(
                        requestor,
                        NumberType.make(),
                        undefined
                    )
                );
            }),
            outputType
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Number.doc),
        getNameLocales(locales, (locale) => locale.basis.Number.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.add
                    ),
                    NumberType.make((left) => left),
                    // The output's type should be the left's type
                    NumberType.make((left) => left),
                    (requestor, left, right) => left.add(requestor, right)
                ),
                FunctionDefinition.make(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.function.subtract.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Number.function.subtract.names
                    ),
                    undefined,
                    [
                        // Optional operand, since negation and subtraction are overloaded.
                        Bind.make(
                            getDocLocales(
                                locales,
                                (t) =>
                                    t.basis.Number.function.subtract.inputs[0]
                                        .doc
                            ),
                            subtractNames,
                            UnionType.make(
                                NoneType.None,
                                NumberType.make((left) => left)
                            ),
                            NoneLiteral.make()
                        ),
                    ],
                    new BasisExpression(
                        NumberType.make(),
                        (requestor, evaluation) => {
                            const left = evaluation.getClosure();
                            const right = evaluation.resolve(subtractNames);
                            // It should be impossible for the left to be a Number, but the type system doesn't know it.
                            if (!(left instanceof Number))
                                return evaluation.getValueOrTypeException(
                                    requestor,
                                    NumberType.make(),
                                    left
                                );
                            if (
                                right !== undefined &&
                                (!(right instanceof Number) ||
                                    !left.unit.accepts(right.unit))
                            )
                                return new TypeException(
                                    evaluation.getDefinition(),
                                    evaluation.getEvaluator(),
                                    left.getType(),
                                    right
                                );
                            return right === undefined
                                ? left.negate(requestor)
                                : left.subtract(requestor, right);
                        }
                    ),
                    NumberType.make((left) => left)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.multiply
                    ),
                    // The operand's type can be any unitless measurement
                    NumberType.wildcard(),
                    // The output's type is is the unit's product
                    NumberType.make((left, right) =>
                        right ? left.product(right) : left
                    ),
                    (requestor, left, right) => left.multiply(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.divide
                    ),
                    NumberType.wildcard(),
                    NumberType.make((left, right) =>
                        right ? left.quotient(right) : left
                    ),
                    (requestor, left, right) => left.divide(requestor, right),
                    false
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.remainder
                    ),
                    NumberType.wildcard(),
                    NumberType.make((left) => left),
                    (requestor, left, right) =>
                        left.remainder(requestor, right),
                    false
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.roundDown
                    ),
                    NumberType.wildcard(),
                    (requestor, left) => left.roundDown(requestor)
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.roundUp
                    ),
                    NumberType.wildcard(),
                    (requestor, left) => left.roundUp(requestor)
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.positive
                    ),
                    NumberType.wildcard(),
                    (requestor, left) => left.absolute(requestor)
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.round
                    ),
                    NumberType.wildcard(),
                    (requestor, left) => left.round(requestor)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.power
                    ),
                    NumberType.wildcard(),
                    NumberType.make((left, right, constant) => {
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
                        (locale) => locale.basis.Number.function.root
                    ),
                    NumberType.wildcard(),
                    NumberType.make((left, right, constant) => {
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
                        (locale) => locale.basis.Number.function.lessThan
                    ),
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) => left.lessThan(requestor, right)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.greaterThan
                    ),
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        left.greaterThan(requestor, right)
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.lessOrEqual
                    ),
                    NumberType.make((unit) => unit),
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
                        (locale) => locale.basis.Number.function.greaterOrEqual
                    ),
                    NumberType.make((unit) => unit),
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
                        (locale) => locale.basis.Number.function.equal
                    ),
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(requestor, left.isEqualTo(right))
                ),
                createBinaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.notequal
                    ),
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new Bool(requestor, !left.isEqualTo(right))
                ),

                // Trigonometry
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.cos
                    ),
                    NumberType.make((unit) => unit),
                    (requestor, left) => left.cos(requestor)
                ),
                createUnaryOp(
                    getFunctionLocales(
                        locales,
                        (locale) => locale.basis.Number.function.sin
                    ),
                    NumberType.make((unit) => unit),
                    (requestor, left) => left.sin(requestor)
                ),

                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.text
                    ),
                    '#?',
                    "''",
                    (requestor: Expression, val: Number) =>
                        new Text(requestor, val.toString())
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.list
                    ),
                    '#',
                    '[#]',
                    (requestor: Expression, val: Number) => {
                        const list = [];
                        const max = val.toNumber();
                        if (max < 0) return new List(requestor, []);
                        for (let i = 1; i <= val.toNumber(); i++)
                            list.push(new Number(requestor, i));
                        return new List(requestor, list);
                    }
                ),

                // Time
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.s2m
                    ),
                    '#s',
                    '#min',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                60,
                                Unit.reuse(['s'], ['min'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.s2h
                    ),
                    '#s',
                    '#h',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                3600,
                                Unit.reuse(['s'], ['h'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.s2day
                    ),
                    '#s',
                    '#day',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                86400,
                                Unit.reuse(['s'], ['day'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.s2wk
                    ),
                    '#s',
                    '#wk',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                604800,
                                Unit.reuse(['s'], ['wk'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.s2year
                    ),
                    '#s',
                    '#yr',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                31449600,
                                Unit.reuse(['s'], ['yr'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.s2ms
                    ),
                    '#s',
                    '#ms',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['s'], ['ms'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.ms2s
                    ),
                    '#ms',
                    '#s',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['ms'], ['s'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.min2s
                    ),
                    '#min',
                    '#s',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                60,
                                Unit.reuse(['s'], ['min'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.h2s
                    ),
                    '#h',
                    '#s',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                3600,
                                Unit.reuse(['s'], ['h'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.day2s
                    ),
                    '#day',
                    '#s',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                86400,
                                Unit.reuse(['s'], ['day'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.wk2s
                    ),
                    '#wk',
                    '#s',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                604800,
                                Unit.reuse(['s'], ['wk'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.yr2s
                    ),
                    '#yr',
                    '#s',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                31449600,
                                Unit.reuse(['s'], ['yr'])
                            )
                        )
                ),

                // Distance
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2pm
                    ),
                    '#m',
                    '#pm',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000000000000,
                                Unit.reuse(['pm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2nm
                    ),
                    '#m',
                    '#nm',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000000000,
                                Unit.reuse(['nm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2micro
                    ),
                    '#m',
                    '#µm',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000000,
                                Unit.reuse(['µm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2mm
                    ),
                    '#m',
                    '#mm',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['mm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2cm
                    ),

                    '#m',
                    '#cm',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                100,
                                Unit.reuse(['cm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2dm
                    ),
                    '#m',
                    '#dm',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(requestor, 10, Unit.reuse(['dm'], ['m']))
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2km
                    ),
                    '#m',
                    '#km',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['m'], ['km'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2Mm
                    ),
                    '#m',
                    '#Mm',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000,
                                Unit.reuse(['m'], ['Mm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2Gm
                    ),
                    '#m',
                    '#Gm',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000000,
                                Unit.reuse(['m'], ['Gm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2Tm
                    ),
                    '#m',
                    '#Tm',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000000000,
                                Unit.reuse(['m'], ['Tm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.pm2m
                    ),
                    '#pm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000000000,
                                Unit.reuse(['pm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.nm2m
                    ),
                    '#nm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000000,
                                Unit.reuse(['nm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.micro2m
                    ),
                    '#µm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000,
                                Unit.reuse(['µm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.mm2m
                    ),
                    '#mm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['mm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.cm2m
                    ),
                    '#cm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                100,
                                Unit.reuse(['cm'], ['m'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.dm2m
                    ),
                    '#dm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(requestor, 10, Unit.reuse(['dm'], ['m']))
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.km2m
                    ),
                    '#km',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['m'], ['km'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.Mm2m
                    ),
                    '#Mm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000000,
                                Unit.reuse(['m'], ['Mm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.Gm2m
                    ),
                    '#Gm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000000000,
                                Unit.reuse(['m'], ['Gm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.Tm2m
                    ),
                    '#Tm',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000000000000,
                                Unit.reuse(['m'], ['Tm'])
                            )
                        )
                ),

                // Imperial conversions
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.km2mi
                    ),
                    '#km',
                    '#mi',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                0.621371,
                                Unit.reuse(['mi'], ['km'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.mi2km
                    ),
                    '#mi',
                    '#km',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                0.621371,
                                Unit.reuse(['mi'], ['km'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.cm2in
                    ),
                    '#cm',
                    '#in',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                0.393701,
                                Unit.reuse(['in'], ['cm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.in2cm
                    ),
                    '#in',
                    '#cm',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                0.393701,
                                Unit.reuse(['in'], ['cm'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.m2ft
                    ),
                    '#m',
                    '#ft',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                0.3048,
                                Unit.reuse(['ft'], ['km'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.ft2m
                    ),
                    '#ft',
                    '#m',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                0.3048,
                                Unit.reuse(['ft'], ['km'])
                            )
                        )
                ),

                // Weight
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.g2mg
                    ),
                    '#g',
                    '#mg',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['mg'], ['g'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.mg2g
                    ),
                    '#mg',
                    '#g',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['mg'], ['g'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.g2kg
                    ),
                    '#g',
                    '#kg',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['g'], ['kg'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.kg2g
                    ),
                    '#kg',
                    '#g',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                1000,
                                Unit.reuse(['g'], ['kg'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.g2oz
                    ),
                    '#g',
                    '#oz',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                0.035274,
                                Unit.reuse(['oz'], ['g'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.oz2g
                    ),
                    '#oz',
                    '#g',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                0.035274,
                                Unit.reuse(['oz'], ['g'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.oz2lb
                    ),
                    '#oz',
                    '#lb',
                    (requestor: Expression, val: Number) =>
                        val.multiply(
                            requestor,
                            new Number(
                                requestor,
                                0.0625,
                                Unit.reuse(['lb'], ['oz'])
                            )
                        )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.lb2oz
                    ),
                    '#lb',
                    '#oz',
                    (requestor: Expression, val: Number) =>
                        val.divide(
                            requestor,
                            new Number(
                                requestor,
                                0.0625,
                                Unit.reuse(['lb'], ['oz'])
                            )
                        )
                ),
            ],
            BlockKind.Structure
        )
    );
}
