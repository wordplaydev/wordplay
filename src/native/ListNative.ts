import Bind from '../nodes/Bind';
import BooleanType from '../nodes/BooleanType';
import FunctionDefinition from '../nodes/FunctionDefinition';
import FunctionType from '../nodes/FunctionType';
import ListType from '../nodes/ListType';
import MeasurementType from '../nodes/MeasurementType';
import NameType from '../nodes/NameType';
import NoneType from '../nodes/NoneType';
import TextType from '../nodes/TextType';
import UnionType from '../nodes/UnionType';
import Value from '../runtime/Value';
import Bool from '../runtime/Bool';
import List from '../runtime/List';
import Text from '../runtime/Text';
import TypeException from '../runtime/TypeException';
import { createNativeConversion, createNativeFunction } from './NativeBindings';
import NativeExpression from './NativeExpression';
import NativeHOFListAll from './NativeHOFListAll';
import NativeHOFListCombine from './NativeHOFListCombine';
import NativeHOFListFilter from './NativeHOFListFilter';
import NativeHOFListFind from './NativeHOFListFind';
import NativeHOFListTranslate from './NativeHOFListTranslate';
import NativeHOFListUntil from './NativeHOFListUntil';
import Set from '../runtime/Set';
import StructureDefinition from '../nodes/StructureDefinition';
import Block from '../nodes/Block';
import type Node from '../nodes/Node';
import Measurement from '../runtime/Measurement';
import type Evaluation from '../runtime/Evaluation';
import TypeVariables from '../nodes/TypeVariables';
import { getDocTranslations } from '../translations/getDocTranslations';
import { getNameTranslations } from '../translations/getNameTranslations';
import TypeVariable from '../nodes/TypeVariable';

export default function bootstrapList() {
    const ListTypeVarNames = getNameTranslations((t) => t.native.list.kind);
    const ListTypeVariable = new TypeVariable(ListTypeVarNames);
    const DefaultListTypeVarName =
        ListTypeVarNames.names[0].getName() as string;

    function getListTypeVariableReference() {
        return new NameType(
            DefaultListTypeVarName,
            undefined,
            ListTypeVariable
        );
    }

    const translateTypeVariable = new TypeVariable(
        getNameTranslations((t) => t.native.list.out)
    );

    const listTranslateHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations(
                    (t) => t.native.list.function.translate.value.doc
                ),
                getNameTranslations(
                    (t) => t.native.list.function.translate.value.name
                ),
                new NameType(
                    DefaultListTypeVarName,
                    undefined,
                    ListTypeVariable
                )
            ),
        ],
        translateTypeVariable.getReference()
    );

    const listFilterHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations(
                    (t) => t.native.list.function.filter.value.doc
                ),
                getNameTranslations(
                    (t) => t.native.list.function.filter.value.name
                ),
                getListTypeVariableReference()
            ),
        ],
        BooleanType.make()
    );

    const listAllHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations((t) => t.native.list.function.all.value.doc),
                getNameTranslations(
                    (t) => t.native.list.function.all.value.name
                ),
                getListTypeVariableReference()
            ),
        ],
        BooleanType.make()
    );

    const listUntilHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations(
                    (t) => t.native.list.function.until.value.doc
                ),
                getNameTranslations(
                    (t) => t.native.list.function.until.value.name
                ),
                BooleanType.make()
            ),
        ],
        getListTypeVariableReference()
    );

    const listFindHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations(
                    (t) => t.native.list.function.find.value.doc
                ),
                getNameTranslations(
                    (t) => t.native.list.function.find.value.name
                ),
                BooleanType.make()
            ),
        ],
        getListTypeVariableReference()
    );

    const combineTypeVariable = new TypeVariable(
        getNameTranslations((t) => t.native.list.out)
    );

    const listCombineHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations(
                    (t) => t.native.list.function.combine.combination.doc
                ),
                getNameTranslations(
                    (t) => t.native.list.function.combine.combination.name
                ),
                combineTypeVariable.getReference()
            ),
            Bind.make(
                getDocTranslations(
                    (t) => t.native.list.function.combine.next.doc
                ),
                getNameTranslations(
                    (t) => t.native.list.function.combine.next.name
                ),
                getListTypeVariableReference()
            ),
        ],
        combineTypeVariable.getReference()
    );

    const addInputNames = getNameTranslations(
        (t) => t.native.list.function.add.inputs[0].name
    );

    const hasInputNames = getNameTranslations(
        (t) => t.native.list.function.has.inputs[0].name
    );

    const joinInputNames = getNameTranslations(
        (t) => t.native.list.function.join.inputs[0].name
    );

    const sansInputNames = getNameTranslations(
        (t) => t.native.list.function.sans.inputs[0].name
    );

    const sansAllInputNames = getNameTranslations(
        (t) => t.native.list.function.sansAll.inputs[0].name
    );

    const equalsInputNames = getNameTranslations(
        (t) => t.native.list.function.equals.inputs[0].name
    );

    const notequalsInputNames = getNameTranslations(
        (t) => t.native.list.function.notequals.inputs[0].name
    );

    return StructureDefinition.make(
        getDocTranslations((t) => t.native.list.doc),
        getNameTranslations((t) => t.native.list.name),
        [],
        TypeVariables.make([ListTypeVariable]),
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createNativeFunction(
                    getDocTranslations((t) => t.native.list.function.add.doc),
                    getNameTranslations((t) => t.native.list.function.add.name),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.list.function.add.inputs[0].doc
                            ),
                            addInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(addInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.add(requestor, value);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.list.function.length.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.length.name
                    ),
                    undefined,
                    [],
                    MeasurementType.make(),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        if (list instanceof List) return list.length(requestor);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.list.function.random.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.random.name
                    ),
                    undefined,
                    [],
                    getListTypeVariableReference(),
                    (_, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List) {
                            const random = evaluation
                                .getEvaluator()
                                .project.streams.random.latest();
                            return list.get(
                                new Measurement(
                                    evaluation.getEvaluator().getMain(),
                                    Math.floor(
                                        random.toNumber() * list.values.length
                                    ) + 1
                                )
                            );
                        } else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.list.function.first.doc),
                    getNameTranslations(
                        (t) => t.native.list.function.first.name
                    ),
                    undefined,
                    [],
                    UnionType.make(
                        getListTypeVariableReference(),
                        NoneType.None
                    ),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof List) return list.first();
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.list.function.has.doc),
                    getNameTranslations((t) => t.native.list.function.has.name),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.list.function.has.inputs[0].doc
                            ),
                            hasInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        const value = evaluation.resolve(hasInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.has(requestor, value);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.list.function.join.doc),
                    getNameTranslations(
                        (t) => t.native.list.function.join.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.list.function.join.inputs[0].doc
                            ),
                            joinInputNames,
                            TextType.make()
                        ),
                    ],
                    TextType.make(),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const separator = evaluation.resolve(joinInputNames);
                        if (list instanceof List && separator instanceof Text)
                            return list.join(requestor, separator);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.list.function.last.doc),
                    getNameTranslations(
                        (t) => t.native.list.function.last.name
                    ),
                    undefined,
                    [],
                    getListTypeVariableReference(),
                    (requestor, evaluation) => {
                        requestor;
                        const list = evaluation.getClosure();
                        if (list instanceof List) return list.last();
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.list.function.sansFirst.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.sansFirst.name
                    ),
                    undefined,
                    [],
                    ListType.make(getListTypeVariableReference()),
                    (requestor, evaluation) => {
                        const list: Value | Evaluation | undefined =
                            evaluation.getClosure();
                        if (list instanceof List)
                            return list.sansFirst(requestor);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.list.function.sansLast.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.sansLast.name
                    ),
                    undefined,
                    [],
                    ListType.make(getListTypeVariableReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List)
                            return list.sansLast(requestor);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.list.function.sans.doc),
                    getNameTranslations(
                        (t) => t.native.list.function.sans.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.list.function.sans.inputs[0].doc
                            ),
                            sansInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(sansInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.sans(requestor, value);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.list.function.sansAll.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.sansAll.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.sansAll.inputs[0].doc
                            ),
                            sansAllInputNames,
                            getListTypeVariableReference()
                        ),
                    ],
                    ListType.make(getListTypeVariableReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        const value = evaluation.resolve(sansAllInputNames);
                        if (list instanceof List && value !== undefined)
                            return list.sansAll(requestor, value);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.list.function.reverse.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.reverse.name
                    ),
                    undefined,
                    [],
                    ListType.make(getListTypeVariableReference()),
                    (requestor, evaluation) => {
                        const list = evaluation.getClosure();
                        if (list instanceof List)
                            return list.reverse(requestor);
                        else
                            return new TypeException(
                                evaluation.getEvaluator(),
                                ListType.make(),
                                list
                            );
                    }
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.list.function.equals.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.equals.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.equals.inputs[0].doc
                            ),
                            equalsInputNames,
                            ListType.make()
                        ),
                    ],
                    new NativeExpression(
                        BooleanType.make(),
                        (requestor, evaluation) => {
                            const list = evaluation.getClosure();
                            const value = evaluation.resolve(equalsInputNames);
                            if (!(list instanceof List))
                                return new TypeException(
                                    evaluation.getEvaluator(),
                                    ListType.make(),
                                    list
                                );
                            if (!(value instanceof Value))
                                return new TypeException(
                                    evaluation.getEvaluator(),
                                    ListType.make(),
                                    value
                                );
                            return new Bool(requestor, list.isEqualTo(value));
                        }
                    ),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.list.function.notequals.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.notequals.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.notequals.inputs[0]
                                        .doc
                            ),
                            notequalsInputNames,
                            ListType.make()
                        ),
                    ],
                    new NativeExpression(
                        BooleanType.make(),
                        (requestor, evaluation) => {
                            const list = evaluation.getClosure();
                            const value =
                                evaluation.resolve(notequalsInputNames);
                            if (!(list instanceof List))
                                return new TypeException(
                                    evaluation.getEvaluator(),
                                    ListType.make(),
                                    list
                                );
                            if (!(value instanceof Value))
                                return new TypeException(
                                    evaluation.getEvaluator(),
                                    ListType.make(),
                                    value
                                );
                            return new Bool(requestor, !list.isEqualTo(value));
                        }
                    ),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.list.function.translate.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.translate.name
                    ),
                    TypeVariables.make([translateTypeVariable]),
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.translate.inputs[0]
                                        .doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.list.function.translate.inputs[0]
                                        .name
                            ),
                            listTranslateHOFType
                        ),
                    ],
                    new NativeHOFListTranslate(listTranslateHOFType),
                    ListType.make(translateTypeVariable.getReference())
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.list.function.filter.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.filter.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.filter.inputs[0].doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.list.function.filter.inputs[0].name
                            ),
                            listFilterHOFType
                        ),
                    ],
                    new NativeHOFListFilter(listFilterHOFType),
                    ListType.make(getListTypeVariableReference())
                ),
                FunctionDefinition.make(
                    getDocTranslations((t) => t.native.list.function.all.doc),
                    getNameTranslations((t) => t.native.list.function.all.name),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.list.function.all.inputs[0].doc
                            ),
                            getNameTranslations(
                                (t) => t.native.list.function.all.inputs[0].name
                            ),
                            listAllHOFType
                        ),
                    ],
                    new NativeHOFListAll(listAllHOFType),
                    BooleanType.make()
                ),
                FunctionDefinition.make(
                    getDocTranslations((t) => t.native.list.function.until.doc),
                    getNameTranslations(
                        (t) => t.native.list.function.until.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.until.inputs[0].doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.list.function.until.inputs[0].name
                            ),
                            listUntilHOFType
                        ),
                    ],
                    new NativeHOFListUntil(listUntilHOFType),
                    ListType.make(getListTypeVariableReference())
                ),
                FunctionDefinition.make(
                    getDocTranslations((t) => t.native.list.function.find.doc),
                    getNameTranslations(
                        (t) => t.native.list.function.find.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.list.function.find.inputs[0].doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.list.function.find.inputs[0].name
                            ),
                            listFindHOFType
                        ),
                    ],
                    new NativeHOFListFind(listFindHOFType),
                    UnionType.make(
                        getListTypeVariableReference(),
                        NoneType.None
                    )
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.list.function.combine.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.list.function.combine.name
                    ),
                    TypeVariables.make([combineTypeVariable]),
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.combine.inputs[0].doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.list.function.combine.inputs[0]
                                        .name
                            )
                        ),
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.list.function.combine.inputs[1].doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.list.function.combine.inputs[1]
                                        .name
                            ),
                            listCombineHOFType
                        ),
                    ],
                    new NativeHOFListCombine(listCombineHOFType),
                    combineTypeVariable.getReference()
                ),
                createNativeConversion(
                    getDocTranslations((t) => t.native.list.conversion.text),
                    '[]',
                    "''",
                    (requestor: Node, val: List) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocTranslations((t) => t.native.list.conversion.set),
                    '[]',
                    '{}',
                    (requestor: Node, val: List) =>
                        new Set(requestor, val.getValues())
                ),
            ],
            false,
            true
        )
    );
}
