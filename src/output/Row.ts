import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import type LanguageCode from '@translation/LanguageCode';
import { getPreferredTranslation } from '@translation/getPreferredTranslation';
import { getBind } from '@translation/getBind';
import Measurement from '../runtime/Measurement';
import Layout from './Layout';
import Group from './Group';
import Phrase from './Phrase';

export const RowType = toStructure(`
    ${getBind((t) => t.output.row.definition, '•')} Layout(
        ${getBind((t) => t.output.row.padding)}•#m: 1m
    )
`);

export class Row extends Layout {
    readonly padding: number;

    constructor(value: Value, padding: Measurement) {
        super(value);

        this.padding = padding.toNumber();
    }

    // Width is the sum of widths plus padding
    getWidth(output: TypeOutput[], context: RenderContext): number {
        return (
            output.reduce(
                (height, group) => height + group.getWidth(context),
                0
            ) +
            this.padding * (output.length - 1)
        );
    }

    // Height is the max height
    getHeight(output: TypeOutput[], context: RenderContext): number {
        return output.reduce(
            (max, group) => Math.max(max, group.getHeight(context)),
            0
        );
    }

    getPlaces(
        children: TypeOutput[],
        context: RenderContext
    ): [TypeOutput, Place][] {
        let position = 0;

        // Get the height of the container so we can center each phrase vertically.
        let height = this.getHeight(children, context);

        const positions: [TypeOutput, Place][] = [];
        for (const child of children) {
            positions.push([
                child,
                new Place(
                    this.value,
                    position,

                    child.place && child.place.y !== undefined
                        ? child.place.y
                        : (height - child.getHeight(context)) / 2,
                    // If the phrase a place, use it's z, otherwise default to the 0 plane.
                    child.place && child.place.z !== undefined
                        ? child.place.z
                        : 0
                ),
            ]);
            position = position + child.getWidth(context);
            position = position + this.padding;
        }

        return positions;
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: TypeOutput[], languages: LanguageCode[]) {
        return getPreferredTranslation(languages).output.row.description(
            output.length,
            output.filter((o) => o instanceof Phrase).length,
            output.filter((o) => o instanceof Group).length
        );
    }
}

export function toRow(value: Value | undefined): Row | undefined {
    if (value === undefined) return undefined;
    const padding = value.resolve(RowType.inputs[0].names.getNames()[0]);
    return padding instanceof Measurement ? new Row(value, padding) : undefined;
}
