import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import { getBind } from '@locale/getBind';
import Arrangement from './Arrangement';
import NumberValue from '@values/NumberValue';
import Phrase from './Phrase';
import Group from './Group';
import concretize from '../locale/concretize';
import type Locale from '../locale/Locale';
import { getOutputInput } from './Output';
import StructureValue from '../values/StructureValue';

export function createStackType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stack, '•')} Arrangement(
        ${getBind(locales, (locale) => locale.output.Stack.alignment)}•-1|0|1: 0
        ${getBind(locales, (locale) => locale.output.Stack.padding)}•#m: 1m
    )
`);
}

export class Stack extends Arrangement {
    readonly padding: number;
    readonly alignment: -1 | 0 | 1;

    constructor(value: Value, alignment: NumberValue, padding: NumberValue) {
        super(value);
        this.padding = padding.toNumber();

        const align = alignment.toNumber();
        this.alignment = align === 0 ? 0 : align < 0 ? -1 : 1;
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
                y = y - child.height;
                // Subtract the child's height to y to get it to its baseline.
                const place = new Place(
                    this.value,
                    // Place the x in the center of the stack, or if it has a place, use that
                    child.output.place && child.output.place.x !== undefined
                        ? child.output.place.x
                        : this.alignment === 0
                        ? (width - child.width) / 2
                        : this.alignment < 0
                        ? 0
                        : width - child.width,
                    // The current y, minus the child's height
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
        ).toText();
    }
}

export function toStack(value: Value | undefined): Stack | undefined {
    if (!(value instanceof StructureValue)) return undefined;
    const alignment = getOutputInput(value, 0);
    const padding = getOutputInput(value, 1);
    return padding instanceof NumberValue && alignment instanceof NumberValue
        ? new Stack(value, alignment, padding)
        : undefined;
}
