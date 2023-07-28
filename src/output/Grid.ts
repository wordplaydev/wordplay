import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import { getBind } from '@locale/getBind';
import Arrangement from './Arrangement';
import Number from '../runtime/Number';
import Place from './Place';
import None from '../runtime/None';
import concretize from '../locale/concretize';
import type Locale from '../locale/Locale';
import { getOutputInputs } from './Output';
import Structure from '../runtime/Structure';

export function createGridType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Grid, '•')} Arrangement(
        ${getBind(locales, (locale) => locale.output.Grid.rows)}•#
        ${getBind(locales, (locale) => locale.output.Grid.columns)}•#
        ${getBind(locales, (locale) => locale.output.Grid.padding)}•#m: 1m
        ${getBind(locales, (locale) => locale.output.Grid.cellWidth)}•#m|ø: ø
        ${getBind(locales, (locale) => locale.output.Grid.cellHeight)}•#m|ø: ø
    )
`);
}

export class Grid extends Arrangement {
    readonly rows: number;
    readonly columns: number;
    readonly padding: number;
    readonly cellWidth: number | undefined;
    readonly cellHeight: number | undefined;

    constructor(
        value: Value,
        rows: Number,
        columns: Number,
        padding: Number,
        cellWidth: Number | None,
        cellHeight: Number | None
    ) {
        super(value);
        this.rows = Math.max(1, rows.toNumber());
        this.columns = Math.max(1, columns.toNumber());
        this.padding = padding.toNumber();
        this.cellWidth =
            cellWidth instanceof Number ? cellWidth.toNumber() : undefined;
        this.cellHeight =
            cellHeight instanceof Number ? cellHeight.toNumber() : undefined;
    }

    getLayout(outputs: (TypeOutput | null)[], context: RenderContext) {
        const layouts = outputs.map((output) =>
            output ? output.getLayout(context) : null
        );

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
        for (let rowIndex = 0; rowIndex < this.rows; rowIndex++) {
            const row = [];
            for (
                let columnIndex = 0;
                columnIndex < this.columns;
                columnIndex++
            ) {
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
        for (let row = 0; row < this.rows; row++) {
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
        for (let column = 0; column < this.columns; column++) {
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
            this.padding * (this.columns - 1);

        const height =
            rowHeights.reduce((sum, height) => sum + height, 0) +
            this.padding * (this.rows - 1);

        // Next, position each child in a cell, iterating through each row from left to right.
        const places: [TypeOutput, Place][] = [];
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
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

    getDescription(_: TypeOutput[], locales: Locale[]) {
        return concretize(
            locales[0],
            locales[0].output.Grid.description,
            this.rows,
            this.columns
        ).toText();
    }
}

export function toGrid(value: Value | undefined): Grid | undefined {
    if (!(value instanceof Structure)) return undefined;

    const [rows, columns, padding, cellWidth, cellHeight] =
        getOutputInputs(value);

    return rows instanceof Number &&
        columns instanceof Number &&
        padding instanceof Number &&
        (cellWidth instanceof Number || cellWidth instanceof None) &&
        (cellHeight instanceof Number || cellHeight instanceof None)
        ? new Grid(value, rows, columns, padding, cellWidth, cellHeight)
        : undefined;
}
