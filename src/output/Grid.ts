import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import type LanguageCode from '@translation/LanguageCode';
import { getPreferredTranslation } from '@translation/getPreferredTranslation';
import { getBind } from '@translation/getBind';
import Layout from './Layout';
import Measurement from '../runtime/Measurement';
import Place from './Place';

export const GridType = toStructure(`
    ${getBind((t) => t.output.grid.definition, '•')} Layout(
        ${getBind((t) => t.output.grid.rows)}•#
        ${getBind((t) => t.output.grid.columns)}•#
        ${getBind((t) => t.output.grid.padding)}•#m: 1m
    )
`);

export class Grid extends Layout {
    readonly rows: number;
    readonly columns: number;
    readonly padding: number;

    constructor(
        value: Value,
        rows: Measurement,
        columns: Measurement,
        padding: Measurement
    ) {
        super(value);
        this.rows = Math.max(1, rows.toNumber());
        this.columns = Math.max(1, columns.toNumber());
        this.padding = padding.toNumber();
    }

    getLayout(outputs: (TypeOutput | null)[], context: RenderContext) {
        const layouts = outputs.map((output) =>
            output ? output.getLayout(context) : null
        );

        // This layout algorithm arranges children from the left to right,
        // starting at the top row, and working towards the bottom.
        // null ouputs take up a cell in the grid, allowing for empty slots.
        // The width of each column is the maximum width of output in the column.
        // The width of each row is the sum of the widths of each column, plus padding.
        // The total height of the grid is the sum of row heights, plus padding.
        // Output is centered within its position its cell.

        // First, compute the max height of each row and max width of each column.
        // This prepares us to position each output within the grid.
        const rowHeights: number[] = [];
        for (let row = 0; row < this.rows; row++) {
            // Find the outputs in this row.
            const rowOutputs = layouts.slice(
                row * this.columns,
                (row + 1) * this.columns
            );
            rowHeights[row] = Math.max.apply(
                Math,
                rowOutputs.map((out) => (out ? out.height : 0))
            );
        }

        const columnWidths: number[] = [];
        for (let column = 0; column < this.columns; column++) {
            // Find the outputs in this column.
            const columnOutputs = layouts.filter(
                (_, index) => index % this.rows === column
            );
            columnWidths[column] = Math.max.apply(
                Math,
                columnOutputs.map((out) => (out ? out.width : 0))
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
                const output = layouts[row * this.columns + col];
                if (output) {
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
                        cellLeft + (columnWidth - output.width) / 2,
                        cellTop + (rowHeight - output.height) / 2,
                        0
                    );
                    places.push([output.output, place]);
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

    getDescription(output: TypeOutput[], languages: LanguageCode[]) {
        return getPreferredTranslation(languages).output.grid.description(
            this.rows,
            this.columns
        );
    }
}

export function toGrid(value: Value | undefined): Grid | undefined {
    if (value === undefined) return undefined;
    const rows = value.resolve(GridType.inputs[0].names.getNames()[0]);
    const columns = value.resolve(GridType.inputs[1].names.getNames()[0]);
    const padding = value.resolve(GridType.inputs[2].names.getNames()[0]);
    return rows instanceof Measurement &&
        columns instanceof Measurement &&
        padding instanceof Measurement
        ? new Grid(value, rows, columns, padding)
        : undefined;
}
