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
        children: TypeOutput[],
        context: RenderContext
    ): [TypeOutput, Place][] {
        // Get the width of the container so we can center each phrase.
        const width = this.getWidth(children, context);

        // Start at the top and work our way down.
        let y = this.getHeight(children, context);

        const positions: [TypeOutput, Place][] = [];
        for (const child of children) {
            // Subtract the child's height to y to get it to its baseline.
            y = y.sub(child.getHeight(context));
            positions.push([
                child,
                new Place(
                    this.value,
                    width.sub(child.getWidth(context)).div(2),
                    y,
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
            // Subtract the padding.
            y = y.sub(this.padding.num);
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
