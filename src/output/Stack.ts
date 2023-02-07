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
import Arrangement from './Arrangement';
import Measurement from '../runtime/Measurement';

export const StackType = toStructure(`
    ${getBind((t) => t.output.stack.definition, '•')} Arrangement(
        ${getBind((t) => t.output.stack.padding)}•#m: 1m
    )
`);

export class Stack extends Arrangement {
    readonly padding: Measurement;

    constructor(value: Value, padding: Measurement) {
        super(value);
        this.padding = padding;
    }

    // Width is the max width
    getWidth(output: TypeOutput[], context: RenderContext): Decimal {
        return output.reduce(
            (max, group) => Decimal.max(max, group.getWidth(context)),
            new Decimal(0)
        );
    }

    // Height is the sum of heights plus padding
    getHeight(output: TypeOutput[], context: RenderContext): Decimal {
        return output
            .reduce(
                (height, group) => height.add(group.getHeight(context)),
                new Decimal(0)
            )
            .add(this.padding.num.times(output.length - 1));
    }

    getPlaces(
        output: TypeOutput[],
        context: RenderContext
    ): [TypeOutput, Place][] {
        let position = new Decimal(0);

        // Get the width of the container so we can center each phrase.
        let width = this.getWidth(output, context);

        const positions: [TypeOutput, Place][] = [];
        for (const group of output) {
            positions.push([
                group,
                new Place(
                    this.value,
                    width.sub(group.getWidth(context)).div(2),
                    position,
                    // If the phrase a place, use it's z, otherwise default to the 0 plane.
                    group instanceof Phrase && group.place
                        ? group.place.z
                        : new Decimal(0),
                    // Use the place's rotation if provided
                    group instanceof Phrase && group.place
                        ? group.place.rotation
                        : new Decimal(0)
                ),
            ]);
            position = position.add(group.getHeight(context));
            position = position.add(this.padding.num);
        }

        return positions;
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(_: TypeOutput[], languages: LanguageCode[]) {
        return getPreferredTranslation(languages).output.stack.description;
    }
}

export function toStack(value: Value | undefined): Stack | undefined {
    if (value === undefined) return undefined;
    const padding = value.resolve(StackType.inputs[0].names.getNames()[0]);
    return padding instanceof Measurement
        ? new Stack(value, padding)
        : undefined;
}
