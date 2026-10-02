import { createBind } from '#locale/createBind.ts';
import { must } from '#util/nullable.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import { createFunction } from '#locale/createFunction.ts';
import { createInputs } from '#locale/createInputs.ts';
import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import BooleanType from '#nodes/BooleanType.ts';
import FunctionType from '#nodes/FunctionType.ts';
import SetType from '#nodes/SetType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import TypeVariable from '#nodes/TypeVariable.ts';
import TypeVariables from '#nodes/TypeVariables.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import BoolValue from '#values/BoolValue.ts';
import ListValue from '#values/ListValue.ts';
import NumberValue from '#values/NumberValue.ts';
import SetValue from '#values/SetValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import ListType from '#nodes/ListType.ts';
import NumberType from '#nodes/NumberType.ts';
import TextType from '#nodes/TextType.ts';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '#basis/Basis.ts';
import { Iteration } from '#basis/Iteration.ts';

/** The value an iteration is on, or undefined past the end. */
function valueAt(info: { index: number; set: SetValue }): Value | undefined {
    return info.set.values[info.index];
}

/** The value an iteration is on, for handing to a function. The iteration's
 *  check stops before the end, so there is always one here. */
function valuesOf(info: { index: number; set: SetValue }): [Value] {
    return [must(valueAt(info), 'a set value')];
}

export default function bootstrapSet(locales: Locales) {
    const SetTypeVariableNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.kind,
    );
    const SetTypeVariable = new TypeVariable(SetTypeVariableNames);

    const SetTranslateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.Set.out),
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Set.doc),
        getNameLocales(locales, (locale) => locale.basis.Set.name),
        // No interfaces
        [],
        // One type variable
        TypeVariables.make([SetTypeVariable]),
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.size,
                    undefined,
                    [],
                    NumberType.make(),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        return !(set instanceof SetValue)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  SetType.make(),
                                  set,
                              )
                            : new NumberValue(
                                  requestor,
                                  set.size(requestor).num,
                              );
                    },
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Set.function.equals,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Set.function.notequals,
                    false,
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.add,
                    undefined,
                    [SetTypeVariable.getReference()],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        const element = evaluation.getInput(0);
                        if (set instanceof SetValue && element !== undefined)
                            return set.add(requestor, element);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.remove,
                    undefined,
                    [SetTypeVariable.getReference()],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const element = evaluation.getInput(0);
                        if (set instanceof SetValue && element !== undefined)
                            return set.remove(requestor, element);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.union,
                    undefined,
                    [SetType.make(SetTypeVariable.getReference())],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const newSet = evaluation.getInput(0);
                        if (
                            set instanceof SetValue &&
                            newSet instanceof SetValue
                        )
                            return set.union(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.intersection,
                    undefined,
                    [SetType.make(SetTypeVariable.getReference())],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set = evaluation.getClosure();
                        const newSet = evaluation.getInput(0);
                        if (
                            set instanceof SetValue &&
                            newSet instanceof SetValue
                        )
                            return set.intersection(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.difference,
                    undefined,
                    [SetType.make(SetTypeVariable.getReference())],
                    SetType.make(SetTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const set = evaluation.getClosure();
                        const newSet = evaluation.getInput(0);
                        if (
                            set instanceof SetValue &&
                            newSet instanceof SetValue
                        )
                            return set.difference(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set,
                            );
                    },
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.Set.function.filter,
                    undefined,
                    [
                        createBind(
                            locales,
                            (t) => t.basis.Set.function.filter.inputs[0],
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.Set.function.filter
                                            .checker,
                                    [
                                        SetTypeVariable.getReference(),
                                        SetType.make(
                                            SetTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                BooleanType.make(),
                            ),
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        set: SetValue;
                        filtered: Value[];
                    }>(
                        SetType.make(SetTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator, expression) => {
                            const set = evaluator.getClosureOf(
                                SetValue,
                                SetType.make(),
                                expression,
                            );
                            if (set instanceof ExceptionValue) return set;
                            return {
                                index: 0,
                                set,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the filter function on the next value.
                        (evaluator, info, expr) =>
                            valueAt(info) === undefined
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      ...valuesOf(info),
                                      info.set,
                                  ]),
                        // See if we're keeping it.
                        (evaluator, info, expression) => {
                            const include = evaluator.popValue(expression);
                            if (!(include instanceof BoolValue))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    include,
                                );
                            const value = valueAt(info);
                            if (include.bool && value !== undefined)
                                info.filtered.push(value);
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the filtered set.
                        (evaluator, info, expression) =>
                            new SetValue(expression, info.filtered),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.Set.function.translate,
                    TypeVariables.make([SetTypeVariable]),
                    [
                        createBind(
                            locales,
                            (t) => t.basis.Set.function.translate.inputs[0],
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (l) =>
                                        l.basis.Set.function.translate
                                            .translator,
                                    [
                                        // The type is a type variable, so we refer to it.
                                        SetTypeVariable.getReference(),
                                        SetType.make(
                                            SetTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                SetTranslateTypeVariable.getReference(),
                            ),
                        ),
                    ],
                    SetType.make(SetTranslateTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        set: SetValue;
                        values: Value[];
                        translated: Value[];
                    }>(
                        SetType.make(SetTranslateTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator, expression) => {
                            const set = evaluator.getClosureOf(
                                SetValue,
                                SetType.make(),
                                expression,
                            );
                            if (set instanceof ExceptionValue) return set;
                            return {
                                index: 0,
                                set,
                                values: set.values,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.values[info.index] === undefined
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      // The check above stops before the end.
                                      must(info.values[info.index], 'a value'),
                                      info.set,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            // Get the translated value.
                            info.translated.push(
                                evaluator.popValue(expression),
                            );
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new SetValue(expression, info.translated),
                    ),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.conversion.text,
                    ),
                    SetType.make(SetTypeVariable.getReference()),
                    TextType.make(),
                    SetValue,
                    (requestor: Expression, val: SetValue) =>
                        new TextValue(requestor, val.toString()),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.conversion.list,
                    ),
                    SetType.make(SetTypeVariable.getReference()),
                    ListType.make(SetTypeVariable.getReference()),
                    SetValue,
                    (requestor: Expression, val: SetValue) =>
                        new ListValue(requestor, val.values),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
