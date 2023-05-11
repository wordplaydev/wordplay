import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
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
import { getDocLocales } from '@translation/getDocLocales';
import { getNameLocales } from '@translation/getNameLocales';
import TypeVariable from '@nodes/TypeVariable';
import type Evaluation from '@runtime/Evaluation';
import type Value from '@runtime/Value';
import type Expression from '../nodes/Expression';

export default function bootstrapMap() {
    const KeyTypeVariableNames = getNameLocales((t) => t.native.map.key);
    const KeyTypeVariable = new TypeVariable(KeyTypeVariableNames);
    const ValueTypeVariableNames = getNameLocales((t) => t.native.map.value);
    const ValueTypeVariable = new TypeVariable(ValueTypeVariableNames);

    const mapFilterHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales((t) => t.native.map.function.filter.key.doc),
                getNameLocales((t) => t.native.map.function.filter.key.names),
                KeyTypeVariable.getReference()
            ),
            Bind.make(
                getDocLocales((t) => t.native.map.function.filter.value.doc),
                getNameLocales((t) => t.native.map.function.filter.value.names),
                ValueTypeVariable.getReference()
            ),
        ],
        BooleanType.make()
    );

    const translateTypeVariable = new TypeVariable(
        getNameLocales((t) => t.native.map.result)
    );

    const mapTranslateHOFType = FunctionType.make(
        undefined,
        [
            Bind.make(
                getDocLocales((t) => t.native.map.function.translate.key.doc),
                getNameLocales(
                    (t) => t.native.map.function.translate.key.names
                ),
                KeyTypeVariable.getReference()
            ),
            Bind.make(
                getDocLocales((t) => t.native.map.function.translate.value.doc),
                getNameLocales(
                    (t) => t.native.map.function.translate.value.names
                ),
                ValueTypeVariable.getReference()
            ),
        ],
        translateTypeVariable.getReference()
    );

    const equalsFunctionValueNames = getNameLocales(
        (t) => t.native.map.function.equals.inputs[0].names
    );
    const notEqualsFunctionValueNames = getNameLocales(
        (t) => t.native.map.function.notequals.inputs[0].names
    );

    const setFunctionKeyNames = getNameLocales(
        (t) => t.native.map.function.set.inputs[0].names
    );

    const setFunctionValueNames = getNameLocales(
        (t) => t.native.map.function.set.inputs[1].names
    );

    const unsetFunctionKeyNames = getNameLocales(
        (t) => t.native.map.function.unset.inputs[0].names
    );

    const removeFunctionValueNames = getNameLocales(
        (t) => t.native.map.function.remove.inputs[0].names
    );

    return StructureDefinition.make(
        getDocLocales((t) => t.native.map.doc),
        getNameLocales((t) => t.native.map.name),
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
                    getDocLocales((t) => t.native.map.function.equals.doc),
                    getNameLocales((t) => t.native.map.function.equals.name),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
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
                    getDocLocales((t) => t.native.map.function.notequals.doc),
                    getNameLocales((t) => t.native.map.function.notequals.name),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
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
                    getDocLocales((t) => t.native.map.function.set.doc),
                    getNameLocales((t) => t.native.map.function.set.name),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                (t) => t.native.map.function.set.inputs[0].doc
                            ),
                            setFunctionKeyNames,
                            KeyTypeVariable.getReference()
                        ),
                        Bind.make(
                            getDocLocales(
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
                    getDocLocales((t) => t.native.map.function.unset.doc),
                    getNameLocales((t) => t.native.map.function.unset.name),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
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
                    getDocLocales((t) => t.native.map.function.remove.doc),
                    getNameLocales((t) => t.native.map.function.remove.name),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
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
                    getDocLocales((t) => t.native.map.function.filter.doc),
                    getNameLocales((t) => t.native.map.function.filter.name),
                    undefined,
                    [
                        Bind.make(
                            getDocLocales(
                                (t) =>
                                    t.native.map.function.filter.inputs[0].doc
                            ),
                            getNameLocales(
                                (t) =>
                                    t.native.map.function.filter.inputs[0].names
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
                    getDocLocales((t) => t.native.map.function.translate.doc),
                    getNameLocales((t) => t.native.map.function.translate.name),
                    TypeVariables.make([translateTypeVariable]),
                    [
                        Bind.make(
                            getDocLocales(
                                (t) =>
                                    t.native.map.function.translate.inputs[0]
                                        .doc
                            ),
                            getNameLocales(
                                (t) =>
                                    t.native.map.function.translate.inputs[0]
                                        .names
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
                    getDocLocales((t) => t.native.map.conversion.text),
                    '{:}',
                    "''",
                    (requestor: Expression, val: Map) =>
                        new Text(requestor, val.toString())
                ),
                createNativeConversion(
                    getDocLocales((t) => t.native.map.conversion.set),
                    '{:}',
                    '{}',
                    (requestor: Expression, val: Map) =>
                        new Set(requestor, val.getKeys())
                ),
                createNativeConversion(
                    getDocLocales((t) => t.native.map.conversion.list),
                    '{:}',
                    '[]',
                    (requestor: Expression, val: Map) =>
                        new List(requestor, val.getValues())
                ),
            ],
            BlockKind.Creator
        )
    );
}
