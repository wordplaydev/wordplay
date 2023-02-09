import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import Decimal from 'decimal.js';
import type LanguageCode from '@translation/LanguageCode';
import { getPreferredTranslation } from '@translation/getPreferredTranslation';
import { getBind } from '@translation/getBind';
import Phrase from './Phrase';
import Measurement from '../runtime/Measurement';
import Arrangement from './Arrangement';

export const RowType = toStructure(`
    ${getBind((t) => t.output.row.definition, '•')} Arrangement(
        ${getBind((t) => t.output.row.padding)}•#m: 1m
    )
`);

export class Row extends Arrangement {
    readonly padding: Measurement;

    constructor(value: Value, padding: Measurement) {
        super(value);

        this.padding = padding;
    }

    // Width is the sum of widths plus padding
    getWidth(output: TypeOutput[], context: RenderContext): Decimal {
        return output
            .reduce(
                (height, group) => height.add(group.getWidth(context)),
                new Decimal(0)
            )
            .add(this.padding.num.times(output.length - 1));
    }

    // Height is the max height
    getHeight(output: TypeOutput[], context: RenderContext): Decimal {
        return output.reduce(
            (max, group) => Decimal.max(max, group.getHeight(context)),
            new Decimal(0)
        );
    }

    getPlaces(
        children: TypeOutput[],
        context: RenderContext
    ): [TypeOutput, Place][] {
        let position = new Decimal(0);

        // Get the height of the container so we can center each phrase vertically.
        let height = this.getHeight(children, context);

        const positions: [TypeOutput, Place][] = [];
        for (const child of children) {
            positions.push([
                child,
                new Place(
                    this.value,
                    position,
                    height.sub(child.getHeight(context)).div(2).neg(),
                    // If the phrase a place, use it's z, otherwise default to the 0 plane.
                    child instanceof Phrase && child.place
                        ? child.place.z
                        : new Decimal(0),
                    // Use the place's rotation if provided
                    child instanceof Phrase && child.place
                        ? child.place.rotation
                        : new Decimal(0)
                ),
            ]);
            position = position.add(child.getWidth(context));
            position = position.add(this.padding.num);
        }

        return positions;
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(_: TypeOutput[], languages: LanguageCode[]) {
        return getPreferredTranslation(languages).output.row.description;
    }
}

export function toRow(value: Value | undefined): Row | undefined {
    if (value === undefined) return undefined;
    const padding = value.resolve(RowType.inputs[0].names.getNames()[0]);
    return padding instanceof Measurement ? new Row(value, padding) : undefined;
}
