import BooleanType from '@nodes/BooleanType';
import FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import NoneType from '@nodes/NoneType';
import TextType from '@nodes/TextType';
import UnionType from '@nodes/UnionType';
import Value from '@values/Value';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import TextValue from '@values/TextValue';
import { createBasisConversion, createBasisFunction } from './Basis';
import SetValue from '@values/SetValue';
import StructureDefinition from '@nodes/StructureDefinition';
import Block, { BlockKind } from '@nodes/Block';
import NumberValue from '@values/NumberValue';
import type Evaluation from '@runtime/Evaluation';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Expression from '../nodes/Expression';
import NoneLiteral from '../nodes/NoneLiteral';
import NoneValue from '@values/NoneValue';
import { Iteration } from './Iteration';
import { createFunction, createInputs as createInputs } from '../locale/Locale';
import ValueException from '../values/ValueException';
import FunctionDefinition from '../nodes/FunctionDefinition';
import Names from '../nodes/Names';
import Bind from '../nodes/Bind';
import AnyType from '../nodes/AnyType';
import InternalExpression from './InternalExpression';
import ConversionException from '@values/ConversionException';
import ExceptionValue from '@values/ExceptionValue';
import SetType from '../nodes/SetType';
import type Locales from '../locale/Locales';

export default function bootstrapList(locales: Locales) {
    const ListTypeVarNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.kind,
    );
    const ListTypeVariable = new TypeVariable(ListTypeVarNames);

    const TranslateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.List.out),
    );

    const CombineTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.List.out),
    );

    /**
     * This function is the fallback when a sequencer isn't provided to List.sorted.
     * It passes through numbers, since they're already numbers, and computes a key
     * for text using unicode code points.
     */
    const DefaultSortSequencer = FunctionDefinition.make(
        undefined,
        Names.make(),
        undefined,
        [Bind.make(undefined, Names.make(), new AnyType())],
        new InternalExpression(
            NumberType.make(),
            [],
            (requestor: Expression, evaluation: Evaluation) => {
                const input = evaluation.getInput(0);
                if (input === undefined)
                    return evaluation.getValueOrTypeException(
                        requestor,
                        new AnyType(),
                        input,
                    );
                else if (input instanceof NumberValue) return input;
                else if (input instanceof TextValue)
                    return input.sequenced(requestor);
                else if (input instanceof NoneValue)
                    return new NumberValue(requestor, 0);
                else
                    return new ConversionException(
                        evaluation.getEvaluator(),
                        requestor,
                        input,
                        NumberType.make(),
                    );
            },
        ),
        NumberType.make(),
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.List.doc),
        getNameLocales(locales, (locale) => locale.basis.List.name),
        [],
        TypeVariables.make([ListTypeVariable]),
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.add,
                    undefined,
                    [ListTypeVariable.getReference()],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (list instanceof ListValue && value !== undefined)
                            return list.add(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.replace,
                    undefined,
                    [NumberType.make(), ListTypeVariable.getReference()],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const index = evaluation.getInput(0);
                        const value = evaluation.getInput(1);
                        if (
                            list instanceof ListValue &&
                            index instanceof NumberValue &&
                            value !== undefined
                        )
                            return list.replace(requestor, index, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.append,
                    undefined,
                    [ListType.make(ListTypeVariable.getReference())],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (!(list instanceof ListValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                        else if (!(value instanceof ListValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value,
                            );
                        else return list.append(requestor, value);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.length,
                    undefined,
                    [],
                    NumberType.make(),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        if (list instanceof ListValue)
                            return list.length(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.shuffled,
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof ListValue) {
                            // Copy the current list.
                            const current = [...list.values];

                            // Start with an empty list.
                            const shuffled = [];

                            // Keep selecting a an item in the current list to remove and insert into the shuffled list.
                            while (current.length > 0) {
                                const random = evaluation
                                    .getEvaluator()
                                    .getRandom();
                                const index =
                                    Math.floor(random * current.length) %
                                    current.length;
                                const value = current[index];
                                current.splice(index, 1);
                                shuffled.push(value);
                            }
                            return new ListValue(requestor, shuffled);
                        } else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.random,
                    undefined,
                    [],
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof ListValue) {
                            const random = evaluation
                                .getEvaluator()
                                .getRandom();
                            return list.get(
                                new NumberValue(
                                    evaluation.getEvaluator().getMain(),
                                    Math.floor(random * list.values.length) + 1,
                                ),
                            );
                        } else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.first,
                    undefined,
                    [],
                    UnionType.make(
                        ListTypeVariable.getReference(),
                        NoneType.None,
                    ),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof ListValue) return list.first();
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.has,
                    undefined,
                    [ListTypeVariable.getReference()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (list instanceof ListValue && value !== undefined)
                            return list.has(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.join,
                    undefined,
                    [TextType.make()],
                    TextType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const separator = evaluation.getInput(0);
                        if (
                            list instanceof ListValue &&
                            separator instanceof TextValue
                        )
                            return list.join(requestor, separator);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.subsequence,
                    undefined,
                    [
                        NumberType.make(),
                        [
                            UnionType.make(NumberType.make(), NoneType.make()),
                            NoneLiteral.make(),
                        ],
                    ],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        const start = evaluation.getInput(0);
                        const end = evaluation.getInput(1);
                        if (!(list instanceof ListValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                        if (!(start instanceof NumberValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                list,
                            );
                        if (
                            !(
                                end instanceof NumberValue ||
                                end instanceof NoneValue
                            )
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                UnionType.make(
                                    NumberType.make(),
                                    NoneType.make(),
                                ),
                                list,
                            );
                        return list.subsequence(requestor, start, end);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.last,
                    undefined,
                    [],
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof ListValue) return list.last();
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.sansFirst,
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        if (list instanceof ListValue)
                            return list.sansFirst(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.sansLast,
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof ListValue)
                            return list.sansLast(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.sans,
                    undefined,
                    [ListTypeVariable.getReference()],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (list instanceof ListValue && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.sansAll,
                    undefined,
                    [ListTypeVariable.getReference()],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (list instanceof ListValue && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.reverse,
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof ListValue)
                            return list.reverse(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.equals,
                    undefined,
                    [new AnyType()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (!(list instanceof ListValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                        if (!(value instanceof Value))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value,
                            );
                        return new BoolValue(requestor, list.isEqualTo(value));
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.notequals,
                    undefined,
                    [new AnyType()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (!(list instanceof ListValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list,
                            );
                        if (!(value instanceof Value))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value,
                            );
                        return new BoolValue(requestor, !list.isEqualTo(value));
                    },
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.translate,
                    TypeVariables.make([TranslateTypeVariable]),
                    createInputs(
                        locales,
                        (t) => t.basis.List.function.translate.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (t) =>
                                        t.basis.List.function.translate
                                            .translator,
                                    [
                                        ListTypeVariable.getReference(),
                                        NumberType.make(),
                                        ListType.make(
                                            ListTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                TranslateTypeVariable.getReference(),
                            ),
                        ],
                    ),
                    ListType.make(TranslateTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: ListValue;
                        translated: Value[];
                    }>(
                        ListType.make(TranslateTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as ListValue,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new NumberValue(expr, info.index),
                                      info.list,
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
                            new ListValue(expression, info.translated),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.filter,
                    undefined,
                    createInputs(
                        locales,
                        (t) => t.basis.List.function.filter.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.List.function.filter
                                            .checker,
                                    [
                                        ListTypeVariable.getReference(),
                                        NumberType.make(),
                                        ListType.make(
                                            ListTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                BooleanType.make(),
                            ),
                        ],
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: ListValue;
                        filtered: Value[];
                    }>(
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as ListValue,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new NumberValue(expr, info.index),
                                      info.list,
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
                                info.filtered.push(info.list.get(info.index));
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new ListValue(expression, info.filtered),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.all,
                    undefined,
                    createInputs(
                        locales,
                        (t) => t.basis.List.function.all.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.List.function.all.checker,
                                    [
                                        ListTypeVariable.getReference(),
                                        NumberType.make(),
                                        ListTypeVariable.getReference(),
                                    ],
                                ),
                                BooleanType.make(),
                            ),
                        ],
                    ),
                    BooleanType.make(),
                    new Iteration<{
                        index: number;
                        list: ListValue;
                        matches: boolean;
                    }>(
                        BooleanType.make(),
                        // Start with an index of one, the list we're checking.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as ListValue,
                                matches: true,
                            };
                        },
                        // If we're past the end, stop. Otherwise, check the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new NumberValue(expr, info.index),
                                      info.list,
                                  ]),
                        // If the value doesn't match, return false. Otherwise, loop back.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof BoolValue))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches,
                                );
                            if (!matches.bool) {
                                info.matches = false;
                                return false;
                            } else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new BoolValue(expression, info.matches),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.until,
                    undefined,
                    createInputs(
                        locales,
                        (t) => t.basis.List.function.until.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.List.function.until
                                            .checker,
                                    [
                                        ListTypeVariable.getReference(),
                                        NumberType.make(),
                                        ListType.make(
                                            ListTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                ListType.make(ListTypeVariable.getReference()),
                            ),
                        ],
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: ListValue;
                    }>(
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index of one and the list we're truncating.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as ListValue,
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new NumberValue(expr, info.index),
                                      info.list,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof BoolValue))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches,
                                );
                            if (!matches.bool) return false;
                            else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            info.list.subsequence(
                                expression,
                                1,
                                info.index + 1,
                            ),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.find,
                    undefined,
                    createInputs(
                        locales,
                        (t) => t.basis.List.function.find.inputs,
                        [
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.List.function.find.checker,
                                    [
                                        ListTypeVariable.getReference(),
                                        NumberType.make(),
                                        ListType.make(
                                            ListTypeVariable.getReference(),
                                        ),
                                    ],
                                ),
                                ListTypeVariable.getReference(),
                            ),
                        ],
                    ),
                    UnionType.make(
                        ListTypeVariable.getReference(),
                        NoneType.None,
                    ),
                    new Iteration<{
                        index: number;
                        list: ListValue;
                    }>(
                        ListTypeVariable.getReference(),
                        // Start with an index of one and the list we're searching.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as ListValue,
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new NumberValue(expr, info.index),
                                      info.list,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof BoolValue))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches,
                                );
                            if (matches.bool) return false;
                            else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info) => info.list.get(info.index),
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.combine,
                    TypeVariables.make([CombineTypeVariable]),
                    createInputs(
                        locales,
                        (t) => t.basis.List.function.combine.inputs,
                        [
                            CombineTypeVariable.getReference(),
                            FunctionType.make(
                                undefined,
                                createInputs(
                                    locales,
                                    (locale) =>
                                        locale.basis.List.function.combine
                                            .combiner,
                                    [
                                        CombineTypeVariable.getReference(),
                                        ListTypeVariable.getReference(),
                                        NumberType.make(),
                                        ListTypeVariable.getReference(),
                                    ],
                                ),

                                CombineTypeVariable.getReference(),
                            ),
                        ],
                    ),
                    CombineTypeVariable.getReference(),
                    new Iteration<{
                        index: number;
                        list: ListValue;
                        combo: Value;
                    }>(
                        CombineTypeVariable.getReference(),
                        // Start with an index of one and the list we're searching.
                        (evaluator, expression) => {
                            const initial = expression.getInput(0, evaluator);
                            if (initial === undefined)
                                return new ValueException(
                                    evaluator,
                                    expression,
                                );
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as ListValue,
                                combo: initial,
                            };
                        },
                        // If we're past the end, stop. Otherwise, create the new combo with the combiner.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 1, [
                                      info.combo,
                                      info.list.get(info.index),
                                      new NumberValue(expr, info.index),
                                      info.list,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const combo = evaluator.popValue(expression);
                            info.combo = combo;
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info) => info.combo,
                    ),
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.sorted,
                    undefined,
                    createInputs(
                        locales,
                        (l) => l.basis.List.function.sorted.inputs,
                        [
                            [
                                UnionType.make(
                                    NoneType.make(),
                                    FunctionType.make(
                                        undefined,
                                        createInputs(
                                            locales,
                                            (l) =>
                                                l.basis.List.function.sorted
                                                    .sequencer,
                                            [ListTypeVariable.getReference()],
                                        ),
                                        NumberType.make(),
                                    ),
                                ),
                                NoneLiteral.make(),
                            ],
                        ],
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    new Iteration<{
                        // The current index we're on in the keying iteration
                        index: number;
                        // The list we're sorting
                        list: ListValue;
                        // The keyed, sorted list, which will eventually be mapped back to the original values.
                        // The number is used for sorting, but we keep a pointer to the value to undecorate at the end.
                        keyed: [NumberValue, Value][];
                    }>(
                        // Produces a list of the same type as was given.
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index at the beginning of the list, a reference to the list for convenience,
                        // and an empty list of keyed values.
                        (evaluator) => {
                            return {
                                index: 1, // 1-indexed, since we index the list, not a Javascript array
                                list: evaluator.getCurrentClosure() as ListValue,
                                keyed: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, key the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(
                                      evaluator,
                                      0,
                                      [info.list.get(info.index)],
                                      DefaultSortSequencer,
                                  ),
                        // Save the keyed value and increment the index.
                        (evaluator, info, expression) => {
                            const key = evaluator.popValue(expression);
                            // We expect the key to be a number. Bail if it's not.
                            if (!(key instanceof NumberValue))
                                return key instanceof ExceptionValue
                                    ? key
                                    : evaluator.getValueOrTypeException(
                                          expression,
                                          NumberType.make(),
                                          key,
                                      );
                            // Remember a mapping from the keyed value to the original value, so we can map it back later.
                            info.keyed.push([key, info.list.get(info.index)]);
                            // Advance to the next item.
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Take the list of keyed values and sort by the keys using JavaScript's Array.sort(), then map to the original value.
                        (evaluator, info, expression) =>
                            new ListValue(
                                expression,
                                info.keyed
                                    .sort(
                                        (a, b) =>
                                            a[0].toNumber() - b[0].toNumber(),
                                    )
                                    .map((pair) => pair[1]),
                            ),
                    ),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.conversion.text,
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    TextType.make(),
                    (requestor: Expression, val: ListValue) =>
                        new TextValue(requestor, val.toString()),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.conversion.set,
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    SetType.make(ListTypeVariable.getReference()),
                    (requestor: Expression, val: ListValue) =>
                        new SetValue(requestor, val.getValues()),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
