import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import ListValue from '#values/ListValue.ts';
import type Locales from '#locale/Locales.ts';
import type Expression from '#nodes/Expression.ts';
import ListType from '#nodes/ListType.ts';
import TableType from '#nodes/TableType.ts';
import TextType from '#nodes/TextType.ts';
import TypeVariable from '#nodes/TypeVariable.ts';
import TypeVariables from '#nodes/TypeVariables.ts';
import TableValue from '#values/TableValue.ts';
import TextValue from '#values/TextValue.ts';
import { createBasisConversion, createEqualsFunction } from '#basis/Basis.ts';

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
                    TableValue,
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
                    TableValue,
                    (requestor: Expression, table: TableValue) =>
                        new TextValue(requestor, table.toWordplay(locales)),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}
