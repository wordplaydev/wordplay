import type Locales from '@locale/Locales';
import { getNameLocales } from '@locale/getNameLocales';
import type Bind from '@nodes/Bind';
import BoolValue from '@values/BoolValue';
import ListValue from '@values/ListValue';
import MapValue from '@values/MapValue';
import MarkupValue from '@values/MarkupValue';
import NoneValue from '@values/NoneValue';
import NumberValue from '@values/NumberValue';
import SetValue from '@values/SetValue';
import StructureValue from '@values/StructureValue';
import TableValue from '@values/TableValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import { first } from '@util/nullable';
import { writeCSVRows } from '@values/export/csv';

/** One column of a grid: what names it, and the unit every number in it shares,
 *  when they share one. */
export type Column = { name: string; unit: string | undefined };

/** A value reshaped as rows and named columns — the only shape CSV can carry.
 *  A cell may be missing, which is not the same as `ø`: a row can be shorter
 *  than the table it belongs to. */
export type Grid = { columns: Column[]; rows: (Value | undefined)[][] };

/**
 * A value as a grid, or undefined when it has no rows-and-columns reading.
 *
 * Deliberately narrow. A list of *lists* is a matrix and would export perfectly
 * well, except that it has no names to put in a header row — and a headerless
 * CSV reads its first row as names when it comes back, so offering it would
 * break the round trip the whole feature rests on. JSON carries it instead.
 */
export default function toGrid(
    value: Value,
    locales: Locales,
): Grid | undefined {
    // A table already is a grid, and it is the only shape that keeps its
    // columns when it has no rows — so an empty one still exports its header.
    if (value instanceof TableValue)
        return {
            columns: bindColumns(value.type.columns, value.rows, locales),
            rows: value.rows.map((row) =>
                value.type.columns.map((column) => row.resolve(column.names)),
            ),
        };

    // One structure is one row.
    if (value instanceof StructureValue)
        return {
            columns: bindColumns(value.type.inputs, [value], locales),
            rows: [value.type.inputs.map((bind) => value.resolve(bind.names))],
        };

    if (value instanceof MapValue) {
        if (value.values.length === 0) return undefined;
        const rows = value.values.map(([key, item]) => [key, item]);
        return {
            columns: [
                columnFor(
                    basisName(locales, (l) => l.basis.Map.key),
                    rows,
                    0,
                ),
                columnFor(
                    basisName(locales, (l) => l.basis.Map.value),
                    rows,
                    1,
                ),
            ],
            rows,
        };
    }

    if (value instanceof ListValue || value instanceof SetValue) {
        const items = value.values;
        const firstItem = first(items);
        if (firstItem === undefined) return undefined;

        // Records: every item a structure of the very same definition. Compared
        // by identity, since a `StructureDefinition` is the AST node every
        // instance of it was built from.
        if (
            firstItem instanceof StructureValue &&
            items.every(
                (item): item is StructureValue =>
                    item instanceof StructureValue &&
                    item.type === firstItem.type,
            )
        ) {
            const binds = firstItem.type.inputs;
            const rows = items.map((item) =>
                binds.map((bind) => item.resolve(bind.names)),
            );
            return { columns: bindColumns(binds, items, locales), rows };
        }

        // Otherwise a single column, but only of things a cell can hold: a
        // ragged list of structures has no columns, and saying so is better
        // than a column of `Name(…)` text.
        if (items.every(isScalar)) {
            const rows = items.map((item) => [item]);
            return {
                columns: [
                    columnFor(
                        basisName(locales, (l) => l.basis.List.kind),
                        rows,
                        0,
                    ),
                ],
                rows,
            };
        }
    }

    return undefined;
}

/** Whether a value fits in a cell on its own terms, rather than as serialized
 *  Wordplay source. */
function isScalar(value: Value): boolean {
    return (
        value instanceof TextValue ||
        value instanceof NumberValue ||
        value instanceof BoolValue ||
        value instanceof NoneValue ||
        value instanceof MarkupValue
    );
}

/** The preferred non-symbolic name of a basis type variable, for the columns of
 *  the shapes that have no binds of their own to name them. */
function basisName(
    locales: Locales,
    accessor: Parameters<typeof getNameLocales>[1],
): string {
    return locales.getName(getNameLocales(locales, accessor), false);
}

function bindColumns(
    binds: Bind[],
    rows: StructureValue[],
    locales: Locales,
): Column[] {
    return binds.map((bind) => ({
        // Never symbolic: a header is read by a person and retyped into a
        // spreadsheet, and `getName` still falls back to the emoji when that is
        // the only name the bind has.
        name: locales.getName(bind.names, false),
        unit: sharedUnit(rows.map((row) => row.resolve(bind.names))),
    }));
}

function columnFor(
    name: string,
    rows: (Value | undefined)[][],
    index: number,
): Column {
    return { name, unit: sharedUnit(rows.map((row) => row[index])) };
}

/**
 * The unit every number in a column carries, when they all carry the same one.
 *
 * Hoisting it into the header is what lets a spreadsheet add the column up. A
 * column mixing units — or mixing a unit with a plain number — keeps them in the
 * cells instead, where they are at least not a lie.
 */
function sharedUnit(cells: (Value | undefined)[]): string | undefined {
    const units = new Set(
        cells
            .filter((cell): cell is NumberValue => cell instanceof NumberValue)
            .map((cell) => cell.unit.toString()),
    );
    const only = units.size === 1 ? first([...units]) : undefined;
    return only === undefined || only === '' ? undefined : only;
}

/** A grid's header and body as CSV text. */
export function gridToCSV(grid: Grid, locales: Locales): string {
    return writeCSVRows([
        grid.columns.map((column) =>
            column.unit === undefined
                ? column.name
                : `${column.name} (${column.unit})`,
        ),
        ...grid.rows.map((row) =>
            row.map((cell, index) =>
                cellText(
                    cell,
                    grid.columns[index]?.unit !== undefined,
                    locales,
                ),
            ),
        ),
    ]);
}

/**
 * One cell.
 *
 * `stripUnit` says the column header already carries it. Booleans are the words
 * `true`/`false` rather than `⊤`/`⊥` because that is what `TableLiteral.from`
 * reads back, and a spreadsheet understands them too.
 */
export function cellText(
    value: Value | undefined,
    stripUnit: boolean,
    locales: Locales,
): string {
    if (value === undefined || value instanceof NoneValue) return '';
    if (value instanceof TextValue) return value.text;
    if (value instanceof BoolValue) return value.bool ? 'true' : 'false';
    if (value instanceof MarkupValue) return value.markup.toText();
    if (value instanceof NumberValue)
        return stripUnit && value.num.isFinite() && !value.num.isNaN()
            ? value.num.toString()
            : value.toWordplay();
    // Anything else is a nested value with no flat reading; its source is the
    // most faithful thing a cell can hold.
    return value.toWordplay(locales);
}
