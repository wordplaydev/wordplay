import { getBind } from '@locale/getBind';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import Decimal from 'decimal.js';
import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import StructureValue from '@values/StructureValue';
import type Alignment from '@output/Alignment';
import Arrangement from '@output/Arrangement';
import type Color from '@output/Color';
import type Output from '@output/Output';
import Place from '@output/Place';
import type RenderContext from '@output/RenderContext';
import { getOutputInput } from '@output/Valued';

export function createStackType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Stack, '•')} Arrangement(
        ${getBind(
            locales,
            (locale) => locale.output.Stack.alignment,
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
            child ? child.getLayout(context) : null,
        );

        // The width is the maximum child width
        const width = new Decimal(
            layouts.reduce(
                (max, layout) => Math.max(max, layout ? layout.width : 0),
                0,
            ),
        );

        // The height is the sum of all of the child heights plus padding between them
        const height = new Decimal(
            layouts.reduce(
                (height, layout) => height + (layout ? layout.height : 0),
                0,
            ) +
                this.padding * (layouts.length - 1),
        );

        // Start at the top and work our way down.
        let y = new Decimal(height);

        // Stack alignment is horizontal, so under an RTL project locale swap the
        // start/end ('<'/'>') alignments; '|' (center) is unaffected.
        const align: Alignment =
            context.locales.getDirection() === 'rtl'
                ? this.alignment === '<'
                    ? '>'
                    : this.alignment === '>'
                      ? '<'
                      : this.alignment
                : this.alignment;

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
                        : align === '|'
                          ? width.sub(child.width).div(2).toNumber()
                          : align === '<'
                            ? 0
                            : width.sub(child.width).toNumber(),
                    // The current y, minus the child's height
                    // There's a rounding error at 0 that causes janky positioning.
                    y.round().equals(0) ? 0 : y.toNumber(),
                    // If the phrase has a place, use it's z, otherwise default to the 0 plane.
                    child.output.place && child.output.place.z !== undefined
                        ? child.output.place.z
                        : 0,
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
        return locales
            .concretize(
                (l) => l.output.Stack.description,
                {
                    count: output.length,
                },
            )
            .toText();
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
