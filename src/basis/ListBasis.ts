import BooleanType from '@nodes/BooleanType';
import FunctionType from '@nodes/FunctionType';
import ListType from '@nodes/ListType';
import NumberType from '@nodes/NumberType';
import NoneType from '@nodes/NoneType';
import TextType from '@nodes/TextType';
import UnionType from '@nodes/UnionType';
import Value from '@runtime/Value';
import Bool from '@runtime/Bool';
import List from '@runtime/List';
import Text from '@runtime/Text';
import { createBasisConversion, createBasisFunction } from './Basis';
import Set from '@runtime/Set';
import StructureDefinition from '@nodes/StructureDefinition';
import Block, { BlockKind } from '@nodes/Block';
import Number from '@runtime/Number';
import type Evaluation from '@runtime/Evaluation';
import TypeVariables from '@nodes/TypeVariables';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Expression from '../nodes/Expression';
import type Locale from '../locale/Locale';
import NoneLiteral from '../nodes/NoneLiteral';
import None from '../runtime/None';
import { Iteration } from './Iteration';
import { createFunction, createInputs as createInputs } from '../locale/Locale';
import ValueException from '../runtime/ValueException';

export default function bootstrapList(locales: Locale[]) {
    const ListTypeVarNames = getNameLocales(
        locales,
        (locale) => locale.basis.List.kind
    );
    const ListTypeVariable = new TypeVariable(ListTypeVarNames);

    const TranslateTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.List.out)
    );

    const CombineTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.List.out)
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
                        if (list instanceof List && value !== undefined)
                            return list.add(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                            list instanceof List &&
                            index instanceof Number &&
                            value !== undefined
                        )
                            return list.replace(requestor, index, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                        if (!(list instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                        else if (!(value instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value
                            );
                        else return list.append(requestor, value);
                    }
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
                        if (list instanceof List) return list.length(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.random,
                    undefined,
                    [],
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List) {
                            const random = evaluation
                                .getEvaluator()
                                .random.latest();
                            return list.get(
                                new Number(
                                    evaluation.getEvaluator().getMain(),
                                    Math.floor(
                                        random.toNumber() * list.values.length
                                    ) + 1
                                )
                            );
                        } else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.first,
                    undefined,
                    [],
                    UnionType.make(
                        ListTypeVariable.getReference(),
                        NoneType.None
                    ),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof List) return list.first();
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                        if (list instanceof List && value !== undefined)
                            return list.has(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                        if (list instanceof List && separator instanceof Text)
                            return list.join(requestor, separator);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                    ListTypeVariable.getReference(),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        const start = evaluation.getInput(0);
                        const end = evaluation.getInput(1);
                        if (!(list instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                        if (!(start instanceof Number))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                list
                            );
                        if (!(end instanceof Number || end instanceof None))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                UnionType.make(
                                    NumberType.make(),
                                    NoneType.make()
                                ),
                                list
                            );
                        return list.subsequence(requestor, start, end);
                    }
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
                        if (list instanceof List) return list.last();
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                        if (list instanceof List)
                            return list.sansFirst(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.sansLast,
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List)
                            return list.sansLast(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                        if (list instanceof List && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
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
                        if (list instanceof List && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.reverse,
                    undefined,
                    [],
                    ListType.make(ListTypeVariable.getReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List)
                            return list.reverse(requestor);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.equals,
                    undefined,
                    [ListType.make()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (!(list instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                        if (!(value instanceof Value))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value
                            );
                        return new Bool(requestor, list.isEqualTo(value));
                    }
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.List.function.notequals,
                    undefined,
                    [ListType.make()],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.getInput(0);
                        if (!(list instanceof List))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                list
                            );
                        if (!(value instanceof Value))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                ListType.make(),
                                value
                            );
                        return new Bool(requestor, !list.isEqualTo(value));
                    }
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
                                            ListTypeVariable.getReference()
                                        ),
                                    ]
                                ),
                                TranslateTypeVariable.getReference()
                            ),
                        ]
                    ),
                    ListType.make(TranslateTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: List;
                        translated: Value[];
                    }>(
                        ListType.make(TranslateTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                translated: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new Number(expr, info.index),
                                      info.list,
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
                            new List(expression, info.translated)
                    )
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
                                            ListTypeVariable.getReference()
                                        ),
                                    ]
                                ),
                                BooleanType.make()
                            ),
                        ]
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: List;
                        filtered: Value[];
                    }>(
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index of one, the list we're translating, and an empty translated list.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                filtered: [],
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new Number(expr, info.index),
                                      info.list,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const include = evaluator.popValue(expression);
                            if (!(include instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    include
                                );
                            if (include.bool)
                                info.filtered.push(info.list.get(info.index));
                            info.index = info.index + 1;
                            return undefined;
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            new List(expression, info.filtered)
                    )
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
                                    ]
                                ),
                                BooleanType.make()
                            ),
                        ]
                    ),
                    BooleanType.make(),
                    new Iteration<{
                        index: number;
                        list: List;
                        matches: boolean;
                    }>(
                        BooleanType.make(),
                        // Start with an index of one, the list we're checking.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                                matches: true,
                            };
                        },
                        // If we're past the end, stop. Otherwise, check the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new Number(expr, info.index),
                                      info.list,
                                  ]),
                        // If the value doesn't match, return false. Otherwise, loop back.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches
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
                            new Bool(expression, info.matches)
                    )
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
                                            ListTypeVariable.getReference()
                                        ),
                                    ]
                                ),
                                ListType.make(ListTypeVariable.getReference())
                            ),
                        ]
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: List;
                    }>(
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index of one and the list we're truncating.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new Number(expr, info.index),
                                      info.list,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches
                                );
                            if (!matches.bool) return false;
                            else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            info.list.subsequence(expression, 1, info.index + 1)
                    )
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
                                            ListTypeVariable.getReference()
                                        ),
                                    ]
                                ),
                                ListTypeVariable.getReference()
                            ),
                        ]
                    ),
                    UnionType.make(
                        ListTypeVariable.getReference(),
                        NoneType.None
                    ),
                    new Iteration<{
                        index: number;
                        list: List;
                    }>(
                        ListTypeVariable.getReference(),
                        // Start with an index of one and the list we're searching.
                        (evaluator) => {
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
                            };
                        },
                        // If we're past the end, stop. Otherwise, evaluate the translator function on the next value.
                        (evaluator, info, expr) =>
                            info.index > info.list.values.length
                                ? false
                                : expr.evaluateFunctionInput(evaluator, 0, [
                                      info.list.get(info.index),
                                      new Number(expr, info.index),
                                      info.list,
                                  ]),
                        // Save the translated value and increment the index.
                        (evaluator, info, expression) => {
                            const matches = evaluator.popValue(expression);
                            if (!(matches instanceof Bool))
                                return evaluator.getValueOrTypeException(
                                    expression,
                                    BooleanType.make(),
                                    matches
                                );
                            if (matches.bool) return false;
                            else {
                                info.index = info.index + 1;
                                return undefined;
                            }
                        },
                        // Create the translated list.
                        (evaluator, info, expression) =>
                            info.list.get(info.index)
                    )
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
                                    ]
                                ),

                                CombineTypeVariable.getReference()
                            ),
                        ]
                    ),
                    CombineTypeVariable.getReference(),
                    new Iteration<{
                        index: number;
                        list: List;
                        combo: Value;
                    }>(
                        CombineTypeVariable.getReference(),
                        // Start with an index of one and the list we're searching.
                        (evaluator, expression) => {
                            const initial = expression.getInput(0, evaluator);
                            if (initial === undefined)
                                return new ValueException(
                                    evaluator,
                                    expression
                                );
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
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
                                      new Number(expr, info.index),
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
                        (evaluator, info, expression) => info.combo
                    )
                ),
                createFunction(
                    locales,
                    (locale) => locale.basis.List.function.sorted,
                    undefined,
                    createInputs(
                        locales,
                        (l) => l.basis.List.function.sorted.inputs,
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
                                        [ListTypeVariable.getReference()]
                                    ),
                                    NumberType.make()
                                )
                            ),
                        ]
                    ),
                    ListType.make(ListTypeVariable.getReference()),
                    new Iteration<{
                        index: number;
                        list: List;
                        combo: Value;
                    }>(
                        ListType.make(ListTypeVariable.getReference()),
                        // Start with an index at the beginning of the list
                        (evaluator, expression) => {
                            const initial = expression.getInput(0, evaluator);
                            if (initial === undefined)
                                return new ValueException(
                                    evaluator,
                                    expression
                                );
                            return {
                                index: 1,
                                list: evaluator.getCurrentClosure() as List,
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
                                      new Number(expr, info.index),
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
                        (evaluator, info, expression) => info.combo
                    )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.conversion.text
                    ),
                    '[]',
                    "''",
                    (requestor: Expression, val: List) =>
                        new Text(requestor, val.toString())
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.List.conversion.set
                    ),
                    `[]`,
                    '{}',
                    (requestor: Expression, val: List) =>
                        new Set(requestor, val.getValues())
                ),
            ],
            BlockKind.Structure
        )
    );
}
