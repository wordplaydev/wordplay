import Bind from '@nodes/Bind';
import Block from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import MapType from '@nodes/MapType';
import StructureDefinition from '@nodes/StructureDefinition';
import List from '@runtime/List';
import Text from '@runtime/Text';
import Map from '@runtime/Map';
import Set from '@runtime/Set';
import HOFMapFilter from './HOFMapFilter';
import HOFMapTranslate from './HOFMapTranslate';
import { createNativeConversion, createNativeFunction } from './NativeBindings';
import Bool from '@runtime/Bool';
import TypeVariables from '@nodes/TypeVariables';
import { getDocTranslations } from '@translation/getDocTranslations';
import { getNameTranslations } from '@translation/getNameTranslations';
import TypeVariable from '@nodes/TypeVariable';
import type Evaluation from '@runtime/Evaluation';
import type Value from '@runtime/Value';
import type Expression from '../nodes/Expression';

export default function bootstrapMap() {
    const KeyTypeVariableNames = getNameTranslations((t) => t.native.map.key);
    const KeyTypeVariable = new TypeVariable(KeyTypeVariableNames);
    const ValueTypeVariableNames = getNameTranslations(
        (t) => t.native.map.value
    );
    const ValueTypeVariable = new TypeVariable(ValueTypeVariableNames);

    const mapFilterHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations((t) => t.native.map.function.filter.key.doc),
                getNameTranslations(
                    (t) => t.native.map.function.filter.key.name
                ),
                KeyTypeVariable.getReference()
            ),
            Bind.make(
                getDocTranslations(
                    (t) => t.native.map.function.filter.value.doc
                ),
                getNameTranslations(
                    (t) => t.native.map.function.filter.value.name
                ),
                ValueTypeVariable.getReference()
            ),
        ],
        BooleanType.make()
    );

    const translateTypeVariable = new TypeVariable(
        getNameTranslations((t) => t.native.map.result)
    );

    const mapTranslateHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocTranslations(
                    (t) => t.native.map.function.translate.key.doc
                ),
                getNameTranslations(
                    (t) => t.native.map.function.translate.key.name
                ),
                KeyTypeVariable.getReference()
            ),
            Bind.make(
                getDocTranslations(
                    (t) => t.native.map.function.translate.value.doc
                ),
                getNameTranslations(
                    (t) => t.native.map.function.translate.value.name
                ),
                ValueTypeVariable.getReference()
            ),
        ],
        translateTypeVariable.getReference()
    );

    const equalsFunctionValueNames = getNameTranslations(
        (t) => t.native.map.function.equals.inputs[0].name
    );
    const notEqualsFunctionValueNames = getNameTranslations(
        (t) => t.native.map.function.notequals.inputs[0].name
    );

    const setFunctionKeyNames = getNameTranslations(
        (t) => t.native.map.function.set.inputs[0].name
    );

    const setFunctionValueNames = getNameTranslations(
        (t) => t.native.map.function.set.inputs[1].name
    );

    const unsetFunctionKeyNames = getNameTranslations(
        (t) => t.native.map.function.unset.inputs[0].name
    );

    const removeFunctionValueNames = getNameTranslations(
        (t) => t.native.map.function.remove.inputs[0].name
    );

    return StructureDefinition.make(
        getDocTranslations((t) => t.native.map.doc),
        getNameTranslations((t) => t.native.map.name),
        // No interfaces
        [],
        // One type variable
        TypeVariables.make([KeyTypeVariable, ValueTypeVariable]),
        // No inputs
        [],
        // Include all of the functions defined above.
        new Block(
            [
                createNativeFunction(
                    getDocTranslations((t) => t.native.map.function.equals.doc),
                    getNameTranslations(
                        (t) => t.native.map.function.equals.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.map.function.equals.inputs[0].doc
                            ),
                            equalsFunctionValueNames,
                            MapType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation?.getClosure();
                        const other = evaluation.resolve(
                            equalsFunctionValueNames
                        );
                        return !(map instanceof Map && other instanceof Map)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  MapType.make(),
                                  other
                              )
                            : new Bool(requestor, map.isEqualTo(other));
                    }
                ),
                createNativeFunction(
                    getDocTranslations(
                        (t) => t.native.map.function.notequals.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.map.function.notequals.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.map.function.notequals.inputs[0]
                                        .doc
                            ),
                            notEqualsFunctionValueNames,
                            MapType.make()
                        ),
                    ],
                    BooleanType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation?.getClosure();
                        const other = evaluation.resolve(
                            notEqualsFunctionValueNames
                        );
                        return !(map instanceof Map && other instanceof Map)
                            ? evaluation.getValueOrTypeException(
                                  requestor,
                                  MapType.make(),
                                  other
                              )
                            : new Bool(requestor, !map.isEqualTo(other));
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.map.function.set.doc),
                    getNameTranslations((t) => t.native.map.function.set.name),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.map.function.set.inputs[0].doc
                            ),
                            setFunctionKeyNames,
                            KeyTypeVariable.getReference()
                        ),
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.map.function.set.inputs[1].doc
                            ),
                            setFunctionValueNames,
                            ValueTypeVariable.getReference()
                        ),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map: Evaluation | Value | undefined =
                            evaluation.getClosure();
                        const key = evaluation.resolve(setFunctionKeyNames);
                        const value = evaluation.resolve(setFunctionValueNames);
                        if (
                            map instanceof Map &&
                            key !== undefined &&
                            value !== undefined
                        )
                            return map.set(requestor, key, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.map.function.unset.doc),
                    getNameTranslations(
                        (t) => t.native.map.function.unset.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) => t.native.map.function.unset.inputs[0].doc
                            ),
                            unsetFunctionKeyNames,
                            KeyTypeVariable.getReference()
                        ),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation.getClosure();
                        const key = evaluation.resolve(unsetFunctionKeyNames);
                        if (map instanceof Map && key !== undefined)
                            return map.unset(requestor, key);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map
                            );
                    }
                ),
                createNativeFunction(
                    getDocTranslations((t) => t.native.map.function.remove.doc),
                    getNameTranslations(
                        (t) => t.native.map.function.remove.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.map.function.remove.inputs[0].doc
                            ),
                            removeFunctionValueNames,
                            ValueTypeVariable.getReference()
                        ),
                    ],
                    MapType.make(),
                    (requestor, evaluation) => {
                        const map = evaluation.getClosure();
                        const value = evaluation.resolve(
                            removeFunctionValueNames
                        );
                        if (map instanceof Map && value !== undefined)
                            return map.remove(requestor, value);
                        else
                            return evaluation.getValueOrTypeException(
                                requestor,
                                MapType.make(),
                                map
                            );
                    }
                ),
                FunctionDefinition.make(
                    getDocTranslations((t) => t.native.map.function.filter.doc),
                    getNameTranslations(
                        (t) => t.native.map.function.filter.name
                    ),
                    undefined,
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.map.function.filter.inputs[0].doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.map.function.filter.inputs[0].name
                            ),
                            mapFilterHOFType
                        ),
                    ],
                    new HOFMapFilter(mapFilterHOFType),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        ValueTypeVariable.getReference()
                    )
                ),
                FunctionDefinition.make(
                    getDocTranslations(
                        (t) => t.native.map.function.translate.doc
                    ),
                    getNameTranslations(
                        (t) => t.native.map.function.translate.name
                    ),
                    TypeVariables.make([translateTypeVariable]),
                    [
                        Bind.make(
                            getDocTranslations(
                                (t) =>
                                    t.native.map.function.translate.inputs[0]
                                        .doc
                            ),
                            getNameTranslations(
                                (t) =>
                                    t.native.map.function.translate.inputs[0]
                                        .name
                            ),
                            mapTranslateHOFType
                        ),
                    ],
                    new HOFMapTranslate(mapTranslateHOFType),
                    MapType.make(
                        KeyTypeVariable.getReference(),
                        translateTypeVariable.getReference()
                    )
                ),
                createNativeConversion(
                    getDocTranslations((t) => t.native.map.conversion.text),
                    '{:}',
                    "''",
                    (requestor: Expression, val: Map) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocTranslations((t) => t.native.map.conversion.set),
                    '{:}',
                    '{}',
                    (requestor: Expression, val: Map) =>
                        new Set(requestor, val.getKeys())
                ),
                createNativeConversion(
                    getDocTranslations((t) => t.native.map.conversion.list),
                    '{:}',
                    '[]',
                    (requestor: Expression, val: Map) =>
                        new List(requestor, val.getValues())
                ),
            ],
            false,
            true
        )
    );
}
