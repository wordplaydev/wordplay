import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import BoolValue from '@values/BoolValue';
import InternalExpression from './InternalExpression';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getInputLocales as getInputLocales } from '@locale/getInputLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locale from '../locale/Locale';
import type Type from '../nodes/Type';
import TableType from '../nodes/TableType';
import TableValue from '../values/TableValue';
import Evaluation from '@runtime/Evaluation';
import type Expression from '../nodes/Expression';
import type Value from '../values/Value';
import { createBasisConversion } from './Basis';
import ListValue from '@values/ListValue';
import ListType from '../nodes/ListType';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import TypeVariables from '../nodes/TypeVariables';
import TypeVariable from '../nodes/TypeVariable';
import AnyType from '../nodes/AnyType';

export default function bootstrapTable(locales: Locale[]) {
    /** This type variable represents the StructureDefinition of a row. */
    const RowTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.Table.row)
    );

    function createTableFunction(
        docs: Docs,
        names: Names,
        inputs: { docs: Docs; names: Names }[],
        types: Type[],
        expression: InternalExpression
    ) {
        return FunctionDefinition.make(
            docs,
            names,
            undefined,
            inputs.map(({ docs, names }, index) =>
                Bind.make(docs, names, types[index])
            ),
            expression,
            expression.type
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Table.doc),
        getNameLocales(locales, (locale) => locale.basis.Table.name),
        [],
        TypeVariables.make([RowTypeVariable]),
        [],
        new Block(
            [
                createTableFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.function.equals.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Table.function.equals.names
                    ),
                    getInputLocales(
                        locales,
                        (locale) => locale.basis.Table.function.equals.inputs
                    ),
                    [new AnyType()],
                    new InternalExpression(
                        BooleanType.make(),
                        [],
                        (requestor, evaluation) =>
                            binaryOp(
                                requestor,
                                evaluation,
                                (requestor, left, right) =>
                                    new BoolValue(
                                        requestor,
                                        left.isEqualTo(right)
                                    )
                            )
                    )
                ),
                createTableFunction(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.function.notequal.doc
                    ),
                    getNameLocales(
                        locales,
                        (locale) => locale.basis.Table.function.notequal.names
                    ),
                    getInputLocales(
                        locales,
                        (locale) => locale.basis.Table.function.notequal.inputs
                    ),
                    [new AnyType()],
                    new InternalExpression(
                        BooleanType.make(),
                        [],
                        (requestor, evaluation) =>
                            binaryOp(
                                requestor,
                                evaluation,
                                (requestor, left, right) =>
                                    new BoolValue(
                                        requestor,
                                        !left.isEqualTo(right)
                                    )
                            )
                    )
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.conversion.list
                    ),
                    TableType.make(),
                    ListType.make(RowTypeVariable.getReference()),
                    (requestor: Expression, table: TableValue) =>
                        new ListValue(requestor, table.rows)
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.conversion.text
                    ),
                    TableType.make(),
                    TextType.make(),
                    (requestor: Expression, table: TableValue) =>
                        new TextValue(requestor, table.toWordplay([]))
                ),
            ],
            BlockKind.Structure
        )
    );
}

function binaryOp(
    requestor: Expression,
    evaluation: Evaluation,
    evaluate: (
        requestor: Expression,
        left: TableValue,
        right: TableValue
    ) => Value
): Value {
    const left = evaluation.getClosure();
    const right = evaluation.resolve(
        (evaluation.getDefinition() as FunctionDefinition).inputs[0].names
    );
    // This should be impossible, but the type system doesn't know it.
    if (!(left instanceof TableValue))
        return evaluation.getValueOrTypeException(
            requestor,
            TableType.make(),
            left instanceof Evaluation ? undefined : left
        );
    if (!(right instanceof TableValue))
        return evaluation.getValueOrTypeException(
            requestor,
            TableType.make(),
            undefined
        );
    else return evaluate(requestor, left, right);
}
