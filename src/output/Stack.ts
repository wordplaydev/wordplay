import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import type Color from './Color';
import type Output from './Output';
import type RenderContext from './RenderContext';
import Place from './Place';
import { getBind } from '@locale/getBind';
import Arrangement from './Arrangement';
import NumberValue from '@values/NumberValue';
import Phrase from './Phrase';
import Group from './Group';
import concretize from '../locale/concretize';
import { getOutputInput } from './Valued';
import StructureValue from '../values/StructureValue';
import Decimal from 'decimal.js';
import type Locales from '../locale/Locales';
import type Alignment from './Alignment';
import TextValue from '@values/TextValue';

export function createStackType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stack, '•')} Arrangement(
        ${getBind(
            locales,
            (locale) => locale.output.Stack.alignment
        )}•'<'|'|'|'>': '|'
        ${getBind(locales, (locale) => locale.output.Stack.padding)}•#m: 1m
    )
`);
}

export class Stack extends Arrangement {
    readonly padding: number;
    readonly alignment: Alignment;

    constructor(value: Value, alignment: TextValue, padding: NumberValue) {
        super(value);
        this.padding = padding.toNumber();
        this.alignment = alignment.text as Alignment;
    }

    getLayout(children: (Output | null)[], context: RenderContext) {
        // Get the layouts of the children
        const layouts = children.map((child) =>
            child ? child.getLayout(context) : null
        );

        // The width is the maximum child width
        const width = new Decimal(
            layouts.reduce(
                (max, layout) => Math.max(max, layout ? layout.width : 0),
                0
            )
        );

        // The height is the sum of all of the child heights plus padding between them
        const height = new Decimal(
            layouts.reduce(
                (height, layout) => height + (layout ? layout.height : 0),
                0
            ) +
                this.padding * (layouts.length - 1)
        );

        // Start at the top and work our way down.
        let y = new Decimal(height);

        const places: [Output, Place][] = [];
        let left = 0,
            bottom = 0,
            right = 0,
            top = 0;
        for (const child of layouts) {
            if (child) {
                y = y.sub(child.height);
                // Subtract the child's height to y to get it to its baseline.
                const place = new Place(
                    this.value,
                    // Place the x in the center of the stack, or if it has a place, use that
                    child.output.place && child.output.place.x !== undefined
                        ? child.output.place.x
                        : this.alignment === '|'
                        ? width.sub(child.width).div(2).toNumber()
                        : this.alignment === '<'
                        ? 0
                        : width.sub(child.width).toNumber(),
                    // The current y, minus the child's height
                    // There's a rounding error at 0 that causes janky positioning.
                    y.round().equals(0) ? 0 : y.toNumber(),
                    // If the phrase has a place, use it's z, otherwise default to the 0 plane.
                    child.output.place && child.output.place.z !== undefined
                        ? child.output.place.z
                        : 0
                );
                places.push([child.output, place]);

                // Subtract the padding.
                y = y.sub(this.padding);

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
            width: width.toNumber(),
            height: height.toNumber(),
            places,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: Output[], locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.output.Stack.description),
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
    return padding instanceof NumberValue && alignment instanceof TextValue
        ? new Stack(value, alignment, padding)
        : undefined;
}
