import { createFunction } from '#locale/createFunction.ts';
import { must } from '#util/nullable.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import { createInputs } from '#locale/createInputs.ts';
import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import BooleanType from '#nodes/BooleanType.ts';
import FunctionType from '#nodes/FunctionType.ts';
import MapType from '#nodes/MapType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import TypeVariable from '#nodes/TypeVariable.ts';
import TypeVariables from '#nodes/TypeVariables.ts';
import type Evaluation from '#runtime/Evaluation.ts';
import BoolValue from '#values/BoolValue.ts';
import ListValue from '#values/ListValue.ts';
import MapValue from '#values/MapValue.ts';
import NumberValue from '#values/NumberValue.ts';
import SetValue from '#values/SetValue.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import ListType from '#nodes/ListType.ts';
import NumberType from '#nodes/NumberType.ts';
import SetType from '#nodes/SetType.ts';
import TextType from '#nodes/TextType.ts';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '#basis/Basis.ts';
import { Iteration } from '#basis/Iteration.ts';

/** The key/value pair an iteration is on, or undefined past the end. */
function pairAt(info: {
    index: number;
    map: MapValue;
}): [Value, Value] | undefined {
    return info.map.values[info.index];
}

/** The pair an iteration is on, for handing to a function. The iteration's
 *  check stops before the end, so there is always one here. */
function pairOf(info: { index: number; map: MapValue }): [Value, Value] {
    return must(pairAt(info), 'a map entry');
}

export default function bootstrapMap(locales: Locales) {
    const KeyTypeVariableNames = getNameLocales(
        locales,
        (locale) => locale.basis.Map.key,
    );
    const KeyTypeVariable = new TypeVariable(KeyTypeVariableNames);
    const ValueTypeVariableNames = getNameLocales(
        locales,
        (locale) => locale.basis.Map.value,
    );
    const ValueTypeVariable = new TypeVariable(ValueTypeVariableNames);

    const TranslateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.Map.result),
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Map.doc),
        getNameLocales(locales, (locale) => locale.basis.Map.name),
        // No interfaces
        [],
        // One type variable
        TypeVariables.make([KeyTypeVariable, ValueTypeVariable]),
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Map.function.size,
                    undefined,
                    [],
                    NumberType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation?.getClosure();
                        return !(map instanceof MapValue)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  MapType.make(),
                                  map,
                              )
                            : new NumberValue(
                                  requestor,
                                  map.size(requestor).num,
                              );
                    },
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Map.function.equals,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Map.function.notequals,
                    false,
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Map.function.set,
                    undefined,
                    [
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference(),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const key = evaluation.getInput(0);
                        const value = evaluation.getInput(1);
                        if (
                            map instanceof MapValue &&
                            key !== undefined &&
                            value !== undefined
                        )
                            return map.set(requestor, key, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Map.function.unset,
                    undefined,
                    [KeyTypeVariable.getReference()],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation.getClosure();
                        const key = evaluation.getInput(0);
                        if (map instanceof MapValue && key !== undefined)
                            return map.unset(requestor, key);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Map.function.remove,
                    undefined,
                    [ValueTypeVariable.getReference()],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (map instanceof MapValue && value !== undefined)
                            return map.remove(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map,
                            );
                    },
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.Map.function.filter,
                    undefined,
                    createInputs(
                        locales,
                        (l) => l.basis.Map.function.filter.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.Map.function.filter
                                            .checker,
                                    [
                                        KeyTypeVariable.getReference(),
                                        ValueTypeVariable.getReference(),
                                        MapType.make(
                                            KeyTypeVariable.getReference(),
                                            ValueTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                BooleanType.make(),
                            ),
                        ],
                    ),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference(),
                    ),
                    new Iteration<{
                        index: number;
                        map: MapValue;
                        filtered: [Value, Value][];
                    }>(
                        MapType.make(
                            KeyTypeVariable.getReference(),
                            ValueTypeVariable.getReference(),
                        ),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator, expression) => {
                            const map = evaluator.getClosureOf(
                                MapValue,
                                MapType.make(),
                                expression,
                            );
                            if (map instanceof ExceptionValue) return map;
                            return {
                                index: 0,
                                map,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            pairAt(info) === undefined
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      ...pairOf(info),
                                      info.map,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const include = evaluator.popValue(expression);
                            if (!(include instanceof BoolValue))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    include,
                                );
                            const pair = pairAt(info);
                            if (include.bool && pair !== undefined)
                                info.filtered.push(pair);
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new MapValue(expression, info.filtered),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.Map.function.translate,
                    TypeVariables.make([TranslateTypeVariable]),
                    createInputs(
                        locales,
                        (t) => t.basis.Map.function.translate.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.Map.function.translate
                                            .translator,
                                    [
                                        KeyTypeVariable.getReference(),
                                        ValueTypeVariable.getReference(),

                                        MapType.make(
                                            KeyTypeVariable.getReference(),
                                            ValueTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                TranslateTypeVariable.getReference(),
                            ),
                        ],
                    ),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        TranslateTypeVariable.getReference(),
                    ),
                    new Iteration<{
                        index: number;
                        map: MapValue;
                        translated: [Value, Value][];
                    }>(
                        MapType.make(
                            KeyTypeVariable.getReference(),
                            TranslateTypeVariable.getReference(),
                        ),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator, expression) => {
                            const map = evaluator.getClosureOf(
                                MapValue,
                                MapType.make(),
                                expression,
                            );
                            if (map instanceof ExceptionValue) return map;
                            return {
                                index: 0,
                                map,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            pairAt(info) === undefined
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      ...pairOf(info),
                                      info.map,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const newValue = evaluator.popValue(expression);
                            const pair = pairAt(info);
                            if (pair !== undefined)
                                info.translated.push([pair[0], newValue]);
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new MapValue(expression, info.translated),
                    ),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Map.conversion.text,
                    ),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference(),
                    ),
                    TextType.make(),
                    MapValue,
                    (requestor: Expression, val: MapValue) =>
                        new TextValue(requestor, val.toString()),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Map.conversion.set,
                    ),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference(),
                    ),
                    SetType.make(KeyTypeVariable.getReference()),
                    MapValue,
                    (requestor: Expression, val: MapValue) =>
                        new SetValue(requestor, val.getKeys()),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Map.conversion.list,
                    ),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference(),
                    ),
                    ListType.make(ValueTypeVariable.getReference()),
                    MapValue,
                    (requestor: Expression, val: MapValue) =>
                        new ListValue(requestor, val.getValues()),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
