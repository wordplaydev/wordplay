import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NoneLiteral from '@nodes/NoneLiteral';
import NoneType from '@nodes/NoneType';
import NumberType from '@nodes/NumberType';
import RangeType from '@nodes/RangeType';
import StructureDefinition from '@nodes/StructureDefinition';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import type Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import RangeValue from '@values/RangeValue';
import TextValue from '@values/TextValue';
import TypeException from '@values/TypeException';
import type Value from '@values/Value';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { FunctionText, NameAndDoc } from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import ListType from '@nodes/ListType';
import Convert from '@nodes/Convert';
import TextType from '@nodes/TextType';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '@basis/Basis';
import InternalExpression from '@basis/InternalExpression';
import createUnitConversions from '@basis/UnitConversions';

export default function bootstrapNumber(locales: Locales) {
    function createBinaryOp(
        text: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
        inputType: Type,
        outputType: Type,
        expression: (
            requestor: Expression,
            left: NumberValue,
            right: NumberValue,
        ) => Value | undefined,
        requireEqualUnits = true,
    ) {
        return createBasisFunction(
            locales,
            text,
            undefined,
            [inputType],
            outputType,
            (requestor, evaluation) => {
                const left: Value | Evaluation | undefined =
                    evaluation.getClosure();
                const right = evaluation.getInput(0);
                // It should be impossible for the left to be a Number, but the type system doesn't know it.
                if (!(left instanceof NumberValue))
                    return evaluation.getValueOrTypeException(
                        evaluation.getDefinition(),
                        NumberType.make(),
                        left,
                    );

                if (!(right instanceof NumberValue))
                    return evaluation.getValueOrTypeException(
                        evaluation.getDefinition(),
                        NumberType.make(),
                        right,
                    );
                if (requireEqualUnits && !left.unit.isEqualTo(right.unit))
                    return new TypeException(
                        evaluation.getDefinition(),
                        evaluation.getEvaluator(),
                        left.getType(),
                        right,
                    );
                return (
                    expression(requestor, left, right) ??
                    new TypeException(
                        evaluation.getDefinition(),
                        evaluation.getEvaluator(),
                        left.getType(),
                        right,
                    )
                );
            },
        );
    }

    function createUnaryOp(
        text: (locale: LocaleText) => FunctionText<readonly NameAndDoc[]>,
        outputType: Type,
        expression: (
            requestor: Expression,
            left: NumberValue,
        ) => Value | undefined,
    ) {
        return createBasisFunction(
            locales,
            text,
            undefined,
            [],
            outputType,
            (requestor, evaluation) => {
                const left: Value | Evaluation | undefined =
                    evaluation.getClosure();
                // It should be impossible for the left to be a Number, but the type system doesn't know it.
                if (!(left instanceof NumberValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        NumberType.make(),
                        left,
                    );
                return (
                    expression(requestor, left) ??
                    evaluation.getValueOrTypeException(
                        requestor,
                        NumberType.make(),
                        undefined,
                    )
                );
            },
        );
    }

    function createBinaryOrUnaryOp(
        text: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
        expression: (
            requestor: Expression,
            left: NumberValue,
            right?: NumberValue,
        ) => Value,
    ) {
        const names = getNameLocales(
            locales,
            (locale) => text(locale).inputs[0].names,
        );

        return FunctionDefinition.make(
            getDocLocales(locales, (l) => text(l).doc),
            getNameLocales(locales, (l) => text(l).names),
            undefined,
            [
                // Optional operand, since add can have a single operand.
                Bind.make(
                    getDocLocales(locales, (l) => text(l).inputs[0].doc),
                    names,
                    UnionType.make(
                        NoneType.None,
                        //The type of the operand is the type of the input.
                        NumberType.make((left) => left),
                    ),
                    NoneLiteral.make(),
                ),
            ],
            new InternalExpression(
                NumberType.make(),
                [],
                (requestor, evaluation) => {
                    const left = evaluation.getClosure();
                    const right = evaluation.resolve(names);
                    // It should be impossible for the left to be a Number, but the type system doesn't know it.
                    if (!(left instanceof NumberValue))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            NumberType.make(),
                            left,
                        );
                    if (
                        right !== undefined &&
                        (!(right instanceof NumberValue) ||
                            !left.unit.accepts(right.unit))
                    )
                        return new TypeException(
                            evaluation.getDefinition(),
                            evaluation.getEvaluator(),
                            left.getType(),
                            right,
                        );
                    return expression(requestor, left, right);
                },
            ),
            // The type of the output is the same as the input type.
            NumberType.make((left) => left),
        );
    }

    // The logarithm: `n.log(base)`, or `n.log()` for the natural logarithm.
    // The base is an optional unitless number and the result is unitless, so this
    // can't reuse createBinaryOrUnaryOp (which requires the operand's unit to match).
    function createLogFunction() {
        const text = (l: LocaleText) => l.basis.Number.function.log;
        const names = getNameLocales(locales, (l) => text(l).inputs[0].names);
        return FunctionDefinition.make(
            getDocLocales(locales, (l) => text(l).doc),
            getNameLocales(locales, (l) => text(l).names),
            undefined,
            [
                Bind.make(
                    getDocLocales(locales, (l) => text(l).inputs[0].doc),
                    names,
                    UnionType.make(NoneType.None, NumberType.make()),
                    NoneLiteral.make(),
                ),
            ],
            new InternalExpression(
                NumberType.make(() => Unit.Empty),
                [],
                (requestor, evaluation) => {
                    const left = evaluation.getClosure();
                    // The base is optional; when omitted it resolves to its ø
                    // default, meaning "natural logarithm".
                    const resolved = evaluation.resolve(names);
                    const base =
                        resolved instanceof NumberValue ? resolved : undefined;
                    if (!(left instanceof NumberValue))
                        return evaluation.getValueOrTypeException(
                            requestor,
                            NumberType.make(),
                            left,
                        );
                    if (
                        resolved !== undefined &&
                        !(resolved instanceof NumberValue) &&
                        !(resolved instanceof NoneValue)
                    )
                        return new TypeException(
                            evaluation.getDefinition(),
                            evaluation.getEvaluator(),
                            NumberType.make(),
                            resolved,
                        );
                    return left.log(requestor, base);
                },
            ),
            NumberType.make(() => Unit.Empty),
        );
    }

    function createVariableOp(
        nameAndDoc: (locale: LocaleText) => NameAndDoc,
        input: (locale: LocaleText) => NameAndDoc,
        evaluator: (
            creator: Expression,
            values: NumberValue[],
            unit: Unit,
        ) => NumberValue,
    ) {
        return FunctionDefinition.make(
            getDocLocales(locales, (locale) => nameAndDoc(locale).doc),
            getNameLocales(locales, (locale) => nameAndDoc(locale).names),
            undefined,
            [
                Bind.make(
                    getDocLocales(locales, (locale) => input(locale).doc),
                    getNameLocales(locales, (locale) => input(locale).names),
                    NumberType.make((unit) => unit),
                    undefined,
                    true,
                ),
            ],
            new InternalExpression(
                NumberType.make((unit) => unit),
                [],
                (requestor: Expression, evaluation: Evaluation): Value => {
                    const left: Value | Evaluation | undefined =
                        evaluation.getClosure();
                    const right = evaluation.getInput(0);

                    // It should be impossible for the left to be a Number, but the type system doesn't know it.
                    if (!(left instanceof NumberValue))
                        return evaluation.getValueOrTypeException(
                            evaluation.getDefinition(),
                            NumberType.make(),
                            left,
                        );

                    const numbers = [left];

                    if (right) {
                        if (!(right instanceof ListValue))
                            return evaluation.getValueOrTypeException(
                                evaluation.getDefinition(),
                                ListType.make(NumberType.make()),
                                right,
                            );
                        for (const num of right.values) {
                            if (!(num instanceof NumberValue))
                                return evaluation.getValueOrTypeException(
                                    evaluation.getDefinition(),
                                    NumberType.make(),
                                    num,
                                );
                            numbers.push(num);
                        }
                    }

                    return evaluator(requestor, numbers, left.unit);
                },
            ),
            NumberType.make((unit) => unit),
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
                createBinaryOrUnaryOp(
                    (l) => l.basis.Number.function.add,
                    (requestor, left, right) =>
                        right === undefined ? left : left.add(requestor, right),
                ),
                createBinaryOrUnaryOp(
                    (l) => l.basis.Number.function.subtract,
                    (requestor, left, right) =>
                        right === undefined
                            ? left.negate(requestor)
                            : left.subtract(requestor, right),
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.multiply,
                    // The operand's type can be any unitless number
                    NumberType.make(),
                    // The output's type is is the unit's product
                    NumberType.make((left, right) =>
                        right ? left.product(right) : left,
                    ),
                    (requestor, left, right) => left.multiply(requestor, right),
                    false,
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.divide,
                    // Divide's operand can be any unitless number
                    NumberType.make(),
                    // Divide's output's type is the unit's quotient, or ø when
                    // the divisor is zero.
                    UnionType.make(
                        NumberType.make((left, right) =>
                            right ? left.quotient(right) : left,
                        ),
                        NoneType.make(),
                    ),
                    (requestor, left, right) => left.divide(requestor, right),
                    false,
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.remainder,
                    NumberType.make(),
                    // Remainder's output is a number, or ø when the divisor is
                    // zero.
                    UnionType.make(
                        NumberType.make((left) => left),
                        NoneType.make(),
                    ),
                    (requestor, left, right) =>
                        left.remainder(requestor, right),
                    false,
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.roundDown,
                    NumberType.make(),
                    (requestor, left) => left.roundDown(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.roundUp,
                    NumberType.make(),
                    (requestor, left) => left.roundUp(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.positive,
                    NumberType.make(),
                    (requestor, left) => left.absolute(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.round,
                    NumberType.make(),
                    (requestor, left) => left.round(requestor),
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.power,
                    NumberType.make(),
                    NumberType.make((left, right, constant) => {
                        right;
                        return constant === undefined
                            ? Unit.Empty
                            : left.power(constant);
                    }),
                    (requestor, left, right) => left.power(requestor, right),
                    false,
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.root,
                    NumberType.make(),
                    NumberType.make((left, right, constant) => {
                        right;
                        return constant === undefined
                            ? Unit.Empty
                            : left.root(constant);
                    }),
                    (requestor, left, right) => left.root(requestor, right),
                    false,
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.range,
                    NumberType.make((unit) => unit),
                    // The range carries its bounds' unit, which createBinaryOp's equal-unit
                    // requirement guarantees the two of them share.
                    RangeType.make((unit) => unit),
                    (requestor, left, right) =>
                        new RangeValue(requestor, left, right),
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.lessThan,
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) => left.lessThan(requestor, right),
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.greaterThan,
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        left.greaterThan(requestor, right),
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.lessOrEqual,
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new BoolValue(
                            requestor,
                            left.lessThan(requestor, right).bool ||
                                left.isEqualTo(right),
                        ),
                ),
                createBinaryOp(
                    (locale) => locale.basis.Number.function.greaterOrEqual,
                    NumberType.make((unit) => unit),
                    BooleanType.make(),
                    (requestor, left, right) =>
                        new BoolValue(
                            requestor,
                            left.greaterThan(requestor, right).bool ||
                                left.isEqualTo(right),
                        ),
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Number.function.equal,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Number.function.notequal,
                    false,
                ),
                // Trigonometry
                createUnaryOp(
                    (locale) => locale.basis.Number.function.cos,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.cos(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.sin,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.sin(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.tan,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.tan(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.arcsin,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.arcsin(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.arccos,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.arccos(requestor),
                ),
                createUnaryOp(
                    (locale) => locale.basis.Number.function.arctan,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.arctan(requestor),
                ),
                // Logarithms and exponentials, whose results are unitless.
                createUnaryOp(
                    (locale) => locale.basis.Number.function.exp,
                    NumberType.make(() => Unit.Empty),
                    (requestor, left) => left.exp(requestor),
                ),
                createLogFunction(),
                // min/max
                createVariableOp(
                    (l) => l.basis.Number.function.min,
                    (l) => l.basis.Number.function.min.inputs[0],
                    (requestor, numbers, unit) => {
                        const min = Math.min(
                            ...numbers.map((val) => val.toNumber()),
                        );
                        return new NumberValue(requestor, min, unit);
                    },
                ),
                createVariableOp(
                    (l) => l.basis.Number.function.max,
                    (l) => l.basis.Number.function.max.inputs[0],
                    (requestor, numbers, unit) => {
                        const max = Math.max(
                            ...numbers.map((val) => val.toNumber()),
                        );
                        return new NumberValue(requestor, max, unit);
                    },
                ),

                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.text,
                    ),
                    '#',
                    "''",
                    (
                        requestor: Expression,
                        val: NumberValue,
                        evaluation: Evaluation,
                    ) => {
                        // Localize the number for output (#1196). If the creator
                        // named a target locale on the conversion's text type
                        // (e.g. `5 → ''/hi-IN`), render in that locale and tag the
                        // resulting text with it; otherwise use the active output
                        // locale and leave the text untagged.
                        const creator = evaluation.getCreator();
                        const requestedLanguage =
                            creator instanceof Convert &&
                            creator.type instanceof TextType
                                ? creator.type.concreteLanguage(
                                      evaluation.getContext(),
                                  )
                                : undefined;
                        const target =
                            requestedLanguage?.getLocaleID() ??
                            locales.getLocale();
                        return new TextValue(
                            requestor,
                            val.toText(target),
                            requestedLanguage,
                        );
                    },
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Number.conversion.list,
                    ),
                    '#',
                    '[#]',
                    (requestor: Expression, val: NumberValue) => {
                        const list = [];
                        const max = val.toNumber();
                        // An unbounded or not-a-number count has no list to make, and
                        // counting to it never finishes — `∞ → []` used to hang here.
                        if (!Number.isFinite(max) || max < 0)
                            return new ListValue(requestor, []);
                        for (let i = 1; i <= max; i++)
                            list.push(new NumberValue(requestor, i));
                        return new ListValue(requestor, list);
                    },
                ),

                // Every unit conversion, generated from the table in UnitConversions.ts.
                ...createUnitConversions(locales),
            ],
            BlockKind.Structure,
        ),
    );
}
