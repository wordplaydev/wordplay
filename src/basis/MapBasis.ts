import { createFunction } from '@locale/createFunction';
import { createInputs } from '@locale/createInputs';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionType from '@nodes/FunctionType';
import MapType from '@nodes/MapType';
import StructureDefinition from '@nodes/StructureDefinition';
import TypeVariable from '@nodes/TypeVariable';
import TypeVariables from '@nodes/TypeVariables';
import type Evaluation from '@runtime/Evaluation';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import NumberValue from '@values/NumberValue';
import SetValue from '@values/SetValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import ListType from '../nodes/ListType';
import NumberType from '../nodes/NumberType';
import SetType from '../nodes/SetType';
import TextType from '../nodes/TextType';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from './Basis';
import { Iteration } from './Iteration';

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
                        (evaluator) => {
                            return {
                                index: 0,
                                map: evaluator.getCurrentClosure() as MapValue,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index >= info.map.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.map.values[info.index][0],
                                      info.map.values[info.index][1],
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
                            if (include.bool)
                                info.filtered.push(info.map.values[info.index]);
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
                        (evaluator) => {
                            return {
                                index: 0,
                                map: evaluator.getCurrentClosure() as MapValue,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index >= info.map.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.map.values[info.index][0],
                                      info.map.values[info.index][1],
                                      info.map,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const newValue = evaluator.popValue(expression);
                            info.translated.push([
                                info.map.values[info.index][0],
                                newValue,
                            ]);
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
                    (requestor: Expression, val: MapValue) =>
                        new ListValue(requestor, val.getValues()),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
