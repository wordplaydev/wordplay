import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import { getBind } from '@locale/getBind';
import Arrangement from './Arrangement';
import Measurement from '../runtime/Measurement';
import Phrase from './Phrase';
import Group from './Group';
import concretize from '../locale/concretize';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';

export function createStackType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (t) => t.output.Stack, '•')} Arrangement(
        ${getBind(locales, (t) => t.output.Stack.padding)}•#m: 1m
    )
`);
}

export class Stack extends Arrangement {
    readonly padding: number;

    constructor(value: Value, padding: Measurement) {
        super(value);
        this.padding = padding.toNumber();
    }

    getLayout(children: (TypeOutput | null)[], context: RenderContext) {
        // Get the layouts of the children
        const layouts = children.map((child) =>
            child ? child.getLayout(context) : null
        );

        // The width is the maximum child width
        const width = layouts.reduce(
            (max, layout) => Math.max(max, layout ? layout.width : 0),
            0
        );

        // The height is the sum of all of the child heights plus padding between them
        const height =
            layouts.reduce(
                (height, layout) => height + (layout ? layout.height : 0),
                0
            ) +
            this.padding * (layouts.length - 1);

        // Start at the top and work our way down.
        let y = height;

        const places: [TypeOutput, Place][] = [];
        let left = 0,
            bottom = 0,
            right = 0,
            top = 0;
        for (const child of layouts) {
            if (child) {
                // Subtract the child's height to y to get it to its baseline.
                y = y - child.height;
                const place = new Place(
                    this.value,
                    // Place the x in the center of the stack, or if it has a place, use that
                    child.output.place && child.output.place.x !== undefined
                        ? child.output.place.x
                        : (width - child.width) / 2,
                    y,
                    // If the phrase has a place, use it's z, otherwise default to the 0 plane.
                    child.output.place && child.output.place.z !== undefined
                        ? child.output.place.z
                        : 0
                );
                places.push([child.output, place]);

                // Subtract the padding.
                y = y - this.padding;

                // Update bounds.
                if (place.x < left) left = place.x;
                if (place.y < bottom) bottom = place.y;
                if (place.x + child.width > right)
                    right = place.x + child.width;
                if (place.y + child.height > top) top = place.y + child.height;
            }
        }

        return {
            left,
            top: bottom,
            right,
            bottom,
            width,
            height,
            places,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: TypeOutput[], locales: Locale[]) {
        return concretize(
            locales[0],
            locales[0].output.Stack.description,
            output.length,
            output.filter((o) => o instanceof Phrase).length,
            output.filter((o) => o instanceof Group).length
        ).toString();
    }
}

export function toStack(
    project: Project,
    value: Value | undefined
): Stack | undefined {
    if (value === undefined) return undefined;
    const padding = value.resolve(
        project.shares.output.stack.inputs[0].names.getNames()[0]
    );
    return padding instanceof Measurement
        ? new Stack(value, padding)
        : undefined;
}
