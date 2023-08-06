import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionType from '@nodes/FunctionType';
import SetType from '@nodes/SetType';
import StructureDefinition from '@nodes/StructureDefinition';
import List from '@runtime/List';
import Text from '@runtime/Text';
import Set from '@runtime/Set';
import { createBasisConversion, createBasisFunction } from './Basis';
import Bool from '@runtime/Bool';
import type Value from '@runtime/Value';
import type Evaluation from '@runtime/Evaluation';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import { createBind, createFunction, createInputs } from '../locale/Locale';
import { Iteration } from './Iteration';
import NumberType from '../nodes/NumberType';
import Number from '../runtime/Number';
import ListType from '../nodes/ListType';
import TextType from '../nodes/TextType';

export default function bootstrapSet(locales: Locale[]) {
    const SetTypeVariableNames = getNameLocales(
        locales,
        (locale) => locale.basis.Set.kind
    );
    const SetTypeVariable = new TypeVariable(SetTypeVariableNames);

    const SetTranslateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.Set.out)
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
                        return !(set instanceof Set)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  SetType.make(),
                                  set
                              )
                            : new Number(requestor, set.size(requestor).num);
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.equals,
                    undefined,
                    [SetType.make()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        const other = evaluation.getInput(0);
                        return !(set instanceof Set && other instanceof Set)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  SetType.make(),
                                  other
                              )
                            : new Bool(requestor, set.isEqualTo(other));
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Set.function.notequals,
                    undefined,
                    [SetType.make()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const set = evaluation?.getClosure();
                        const other = evaluation.getInput(0);
                        return !(set instanceof Set && other instanceof Set)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  SetType.make(),
                                  other
                              )
                            : new Bool(requestor, !set.isEqualTo(other));
                    }
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
                        if (set instanceof Set && element !== undefined)
                            return set.add(requestor, element);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
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
                        if (set instanceof Set && element !== undefined)
                            return set.remove(requestor, element);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
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
                        if (set instanceof Set && newSet instanceof Set)
                            return set.union(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
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
                        if (set instanceof Set && newSet instanceof Set)
                            return set.intersection(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
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
                        if (set instanceof Set && newSet instanceof Set)
                            return set.difference(requestor, newSet);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                SetType.make(),
                                set
                            );
                    }
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
                                            SetTypeVariable.getReference()
                                        ),
                                    ]
                                ),
                                BooleanType.make()
                            )
                        ),
                    ],
                    SetType.make(SetTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        set: Set;
                        filtered: Value[];
                    }>(
                        SetType.make(SetTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 0,
                                set: evaluator.getCurrentClosure() as Set,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the filter function on the next value.
                        (evaluator, info, expr) =>
                            info.index >= info.set.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.set.values[info.index],
                                      info.set,
                                  ]),
                        // See if we're keeping it.
                        (evaluator, info, expression) => {
                            const include = evaluator.popValue(expression);
                            if (!(include instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    include
                                );
                            if (include.bool)
                                info.filtered.push(info.set.values[info.index]);
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the filtered set.
                        (evaluator, info, expression) =>
                            new Set(expression, info.filtered)
                    )
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
                                            SetTypeVariable.getReference()
                                        ),
                                    ]
                                ),
                                SetTranslateTypeVariable.getReference()
                            )
                        ),
                    ],
                    SetType.make(SetTranslateTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        set: Set;
                        values: Value[];
                        translated: Value[];
                    }>(
                        SetType.make(SetTranslateTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 0,
                                set: evaluator.getCurrentClosure() as Set,
                                values: (evaluator.getCurrentClosure() as Set)
                                    .values,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index >= info.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.values[info.index],
                                      info.set,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            // Get the translated value.
                            info.translated.push(
                                evaluator.popValue(expression)
                            );
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new Set(expression, info.translated)
                    )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.conversion.text
                    ),
                    SetType.make(SetTypeVariable.getReference()),
                    TextType.make(),
                    (requestor: Expression, val: Set) =>
                        new Text(requestor, val.toString())
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Set.conversion.list
                    ),
                    SetType.make(SetTypeVariable.getReference()),
                    ListType.make(SetTypeVariable.getReference()),
                    (requestor: Expression, val: Set) =>
                        new List(requestor, val.values)
                ),
            ],
            BlockKind.Structure
        )
    );
}
