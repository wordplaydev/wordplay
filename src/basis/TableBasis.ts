import Block, { BlockKind } from '@nodes/Block';
import StructureDefinition from '@nodes/StructureDefinition';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import TableType from '../nodes/TableType';
import type TableValue from '../values/TableValue';
import type Expression from '../nodes/Expression';
import { createBasisConversion, createEqualsFunction } from './Basis';
import ListValue from '@values/ListValue';
import ListType from '../nodes/ListType';
import TextType from '../nodes/TextType';
import TextValue from '../values/TextValue';
import TypeVariables from '../nodes/TypeVariables';
import TypeVariable from '../nodes/TypeVariable';
import type Locales from '../locale/Locales';

export default function bootstrapTable(locales: Locales) {
    /** This type variable represents the StructureDefinition of a row. */
    const RowTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.Table.row)
    );

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Table.doc),
        getNameLocales(locales, (locale) => locale.basis.Table.name),
        [],
        TypeVariables.make([RowTypeVariable]),
        [],
        new Block(
            [
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Table.function.equals,
                    true
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Table.function.notequal,
                    false
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
                        new TextValue(requestor, table.toWordplay(locales))
                ),
            ],
            BlockKind.Structure
        )
    );
}
