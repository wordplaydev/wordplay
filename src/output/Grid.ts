import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import type Color from './Color';
import type Output from './Output';
import type RenderContext from './RenderContext';
import { getBind } from '@locale/getBind';
import Arrangement from './Arrangement';
import NumberValue from '@values/NumberValue';
import Place from './Place';
import NoneValue from '@values/NoneValue';
import concretize from '../locale/concretize';
import { getOutputInputs } from './Valued';
import StructureValue from '../values/StructureValue';
import type Locales from '../locale/Locales';

export function createGridType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Grid, '•')} Arrangement(
        ${getBind(locales, (locale) => locale.output.Grid.rows)}•#|ø:ø
        ${getBind(locales, (locale) => locale.output.Grid.columns)}•#|ø:ø
        ${getBind(locales, (locale) => locale.output.Grid.padding)}•#m:1m
        ${getBind(locales, (locale) => locale.output.Grid.cellWidth)}•#m|ø: ø
        ${getBind(locales, (locale) => locale.output.Grid.cellHeight)}•#m|ø: ø
    )
`);
}

export class Grid extends Arrangement {
    readonly rows: number | undefined;
    readonly columns: number | undefined;
    readonly padding: number;
    readonly cellWidth: number | undefined;
    readonly cellHeight: number | undefined;

    constructor(
        value: Value,
        rows: NumberValue | NoneValue,
        columns: NumberValue | NoneValue,
        padding: NumberValue,
        cellWidth: NumberValue | NoneValue,
        cellHeight: NumberValue | NoneValue
    ) {
        super(value);
        this.rows =
            rows instanceof NoneValue
                ? undefined
                : Math.max(1, rows.toNumber());
        this.columns =
            columns instanceof NoneValue
                ? undefined
                : Math.max(1, columns.toNumber());
        this.padding = padding.toNumber();
        this.cellWidth =
            cellWidth instanceof NumberValue ? cellWidth.toNumber() : undefined;
        this.cellHeight =
            cellHeight instanceof NumberValue
                ? cellHeight.toNumber()
                : undefined;
    }

    getLayout(outputs: (Output | null)[], context: RenderContext) {
        const layouts = outputs.map((output) =>
            output ? output.getLayout(context) : null
        );

        // Figure out the number of rows and columns to have.
        const rows: number =
            this.rows ??
            (this.columns
                ? Math.ceil(outputs.length / this.columns)
                : Math.ceil(Math.sqrt(outputs.length)));
        const columns: number =
            this.columns ??
            (this.rows
                ? Math.ceil(outputs.length / this.rows)
                : Math.ceil(Math.sqrt(outputs.length)));

        // This layout algorithm arranges children from the left to right,
        // starting at the top row, and working towards the bottom.
        // null outputs take up a cell in the grid, allowing for empty slots.
        // The width of each column is the maximum width of output in the column.
        // The width of each row is the sum of the widths of each column, plus padding.
        // The total height of the grid is the sum of row heights, plus padding.
        // Output is centered within its position its cell.

        // First, build a matrix of the requested size.
        const grid = [];
        const unplaced = layouts.slice();
        for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
            const row = [];
            for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
                row.push({
                    output: unplaced.shift() ?? null,
                    place: undefined,
                });
            }
            grid.push(row);
        }

        // First, compute the max height of each row and max width of each column.
        // This prepares us to position each output within the grid.
        const rowHeights: number[] = [];
        for (let row = 0; row < rows; row++) {
            // The row height is the explicit cell height or the max height in the row.
            rowHeights[row] =
                this.cellHeight !== undefined
                    ? this.cellHeight
                    : grid[row].reduce(
                          (max, cell) =>
                              cell.output && cell.output.height > max
                                  ? cell.output.height
                                  : max,
                          0
                      );
        }

        const columnWidths: number[] = [];
        for (let column = 0; column < columns; column++) {
            columnWidths[column] =
                this.cellWidth !== undefined
                    ? this.cellWidth
                    : grid
                          .map((row) => row[column])
                          .reduce(
                              (max, cell) =>
                                  cell.output && cell.output.width > max
                                      ? cell.output.width
                                      : max,
                              0
                          );
        }

        const width =
            columnWidths.reduce((sum, width) => sum + width, 0) +
            this.padding * (columns - 1);

        const height =
            rowHeights.reduce((sum, height) => sum + height, 0) +
            this.padding * (rows - 1);

        // Next, position each child in a cell, iterating through each row from left to right.
        const places: [Output, Place][] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                // Get the output in this cell.
                const cell = grid[row][col];
                if (cell.output) {
                    const cellLeft =
                        columnWidths
                            .slice(0, col)
                            .reduce((sum, width) => sum + width, 0) +
                        col * this.padding;
                    const columnWidth = columnWidths[col];
                    const cellTop =
                        height -
                        (rowHeights
                            .slice(0, row + 1)
                            .reduce((sum, height) => sum + height, 0) +
                            row * this.padding);
                    const rowHeight = rowHeights[row];
                    const place = new Place(
                        this.value,
                        cellLeft + (columnWidth - cell.output.width) / 2,
                        cellTop + (rowHeight - cell.output.height) / 2,
                        0
                    );
                    places.push([cell.output.output, place]);
                }
            }
        }

        return {
            left: 0,
            top: height,
            right: width,
            bottom: 0,
            width,
            height,
            places,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(_: Output[], locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.output.Grid.description),
            this.rows,
            this.columns
        ).toText();
    }
}

export function toGrid(value: Value | undefined): Grid | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const [rows, columns, padding, cellWidth, cellHeight] =
        getOutputInputs(value);

    return (rows instanceof NumberValue || rows instanceof NoneValue) &&
        (columns instanceof NumberValue || columns instanceof NoneValue) &&
        padding instanceof NumberValue &&
        (cellWidth instanceof NumberValue || cellWidth instanceof NoneValue) &&
        (cellHeight instanceof NumberValue || cellHeight instanceof NoneValue)
        ? new Grid(value, rows, columns, padding, cellWidth, cellHeight)
        : undefined;
}
