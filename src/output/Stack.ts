import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import type LanguageCode from '@translation/LanguageCode';
import { getPreferredTranslation } from '@translation/getPreferredTranslation';
import { getBind } from '@translation/getBind';
import Layout from './Layout';
import Measurement from '../runtime/Measurement';

export const StackType = toStructure(`
    ${getBind((t) => t.output.stack.definition, '•')} Layout(
        ${getBind((t) => t.output.stack.padding)}•#m: 1m
    )
`);

export class Stack extends Layout {
    readonly padding: number;

    constructor(value: Value, padding: Measurement) {
        super(value);
        this.padding = padding.toNumber();
    }

    // Width is the max width
    getWidth(output: TypeOutput[], context: RenderContext): number {
        return output.reduce(
            (max, group) => Math.max(max, group.getWidth(context)),
            0
        );
    }

    // Height is the sum of heights plus padding
    getHeight(output: TypeOutput[], context: RenderContext): number {
        return (
            output.reduce(
                (height, group) => height + group.getHeight(context),
                0
            ) +
            this.padding * (output.length - 1)
        );
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
            y = y - child.getHeight(context);
            positions.push([
                child,
                new Place(
                    this.value,
                    // Place the x in the center of the stack, or if it has a place, use that
                    child.place && child.place.x !== undefined
                        ? child.place.x
                        : (width - child.getWidth(context)) / 2,
                    y,
                    // If the phrase has a place, use it's z, otherwise default to the 0 plane.
                    child.place && child.place.z !== undefined
                        ? child.place.z
                        : 0
                ),
            ]);
            // Subtract the padding.
            y = y - this.padding;
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
