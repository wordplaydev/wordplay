import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Block, { BlockKind } from '@nodes/Block';
import StructureDefinition from '@nodes/StructureDefinition';
import ListValue from '@values/ListValue';
import type Locales from '../locale/Locales';
import type Expression from '../nodes/Expression';
import ListType from '../nodes/ListType';
import TableType from '../nodes/TableType';
import TextType from '../nodes/TextType';
import TypeVariable from '../nodes/TypeVariable';
import TypeVariables from '../nodes/TypeVariables';
import type TableValue from '../values/TableValue';
import TextValue from '../values/TextValue';
import { createBasisConversion, createEqualsFunction } from './Basis';

export default function bootstrapTable(locales: Locales) {
    /** This type variable represents the StructureDefinition of a row. */
    const RowTypeVariable = new TypeVariable(
        getNameLocales(locales, (locale) => locale.basis.Table.row),
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
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Table.function.notequal,
                    false,
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.conversion.list,
                    ),
                    TableType.make(),
                    ListType.make(RowTypeVariable.getReference()),
                    (requestor: Expression, table: TableValue) =>
                        new ListValue(requestor, table.rows),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Table.conversion.text,
                    ),
                    TableType.make(),
                    TextType.make(),
                    (requestor: Expression, table: TableValue) =>
                        new TextValue(requestor, table.toWordplay(locales)),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
