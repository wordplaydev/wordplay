import Bind from '@nodes/Bind';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import Bool from '@runtime/Bool';
import InternalExpression from './InternalExpression';
import type Docs from '@nodes/Docs';
import type Names from '@nodes/Names';
import { getInputLocales as getInputLocales } from '@locale/getInputLocales';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locale from '../locale/Locale';
import type Type from '../nodes/Type';
import TableType from '../nodes/TableType';
import Table from '../runtime/Table';
import Evaluation from '../runtime/Evaluation';
import type Expression from '../nodes/Expression';
import type Value from '../runtime/Value';
import { createBasisConversion } from './Basis';
import List from '../runtime/List';
import ListType from '../nodes/ListType';
import TextType from '../nodes/TextType';
import Text from '../runtime/Text';
import TypeVariables from '../nodes/TypeVariables';
import TypeVariable from '../nodes/TypeVariable';

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
                    [TableType.make()],
                    new InternalExpression(
                        BooleanType.make(),
                        [],
                        (requestor, evaluation) =>
                            binaryOp(
                                requestor,
                                evaluation,
                                (requestor, left, right) =>
                                    new Bool(requestor, left.isEqualTo(right))
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
                    [TableType.make()],
                    new InternalExpression(
                        BooleanType.make(),
                        [],
                        (requestor, evaluation) =>
                            binaryOp(
                                requestor,
                                evaluation,
                                (requestor, left, right) =>
                                    new Bool(requestor, !left.isEqualTo(right))
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
                    (requestor: Expression, table: Table) =>
                        new List(requestor, table.rows)
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.conversion.text
                    ),
                    TableType.make(),
                    TextType.make(),
                    (requestor: Expression, table: Table) =>
                        new Text(requestor, table.toWordplay([]))
                ),
            ],
            BlockKind.Structure
        )
    );
}

function binaryOp(
    requestor: Expression,
    evaluation: Evaluation,
    evaluate: (requestor: Expression, left: Table, right: Table) => Value
): Value {
    const left = evaluation.getClosure();
    const right = evaluation.resolve(
        (evaluation.getDefinition() as FunctionDefinition).inputs[0].names
    );
    // This should be impossible, but the type system doesn't know it.
    if (!(left instanceof Table))
        return evaluation.getValueOrTypeException(
            requestor,
            TableType.make(),
            left instanceof Evaluation ? undefined : left
        );
    if (!(right instanceof Table))
        return evaluation.getValueOrTypeException(
            requestor,
            TableType.make(),
            undefined
        );
    else return evaluate(requestor, left, right);
}
