import toStructure from '../basis/toStructure';
import type Value from '@values/Value';
import type Color from './Color';
import type Output from './Output';
import type RenderContext from './RenderContext';
import Place from './Place';
import { getBind } from '@locale/getBind';
import NumberValue from '@values/NumberValue';
import Arrangement from './Arrangement';
import Group from './Group';
import Phrase from './Phrase';
import concretize from '../locale/concretize';
import { getOutputInput } from './Valued';
import StructureValue from '../values/StructureValue';
import type Locales from '../locale/Locales';
import TextValue from '@values/TextValue';
import type Alignment from './Alignment';

export function createRowType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Row, '•')} Arrangement(
        ${getBind(
            locales,
            (locale) => locale.output.Row.alignment
        )}•'<'|'|'|'>': '|'
        ${getBind(locales, (locale) => locale.output.Row.padding)}•#m: 1m
    )
`);
}

export class Row extends Arrangement {
    readonly alignment: Alignment;
    readonly padding: number;

    constructor(value: Value, alignment: TextValue, padding: NumberValue) {
        super(value);

        this.alignment = alignment.text as Alignment;
        this.padding = padding.toNumber();
    }

    getLayout(children: (Output | null)[], context: RenderContext) {
        // Layout the children.
        const layouts = children.map((child) =>
            child === null ? null : child.getLayout(context)
        );

        // Width is the some of the child widths plus padding between
        const width =
            layouts.reduce(
                (width, layout) => width + (layout === null ? 0 : layout.width),
                0
            ) +
            this.padding * (layouts.length - 1);

        // Get the height of the container so we can center each phrase vertically.
        const height = layouts.reduce(
            (max, layout) => Math.max(max, layout === null ? 0 : layout.height),
            0
        );

        let x = 0;
        let left = 0,
            top = 0,
            right = 0,
            bottom = 0;
        const positions: [Output, Place][] = [];
        // Layout each child from start to end.
        for (const child of layouts) {
            if (child) {
                const place = new Place(
                    this.value,
                    // Current x position
                    x,
                    // If a y is specified, use it.
                    child.output.place && child.output.place.y !== undefined
                        ? child.output.place.y
                        : // If vertical alignment is centered, center y.
                        this.alignment === '|'
                        ? (height - child.height) / 2
                        : // If alignment is top, 0.
                        this.alignment === '<'
                        ? 0
                        : // If alignment is bottom
                          height - child.height,
                    // If the phrase a place, use it's z, otherwise default to the 0 plane.
                    child.output.place && child.output.place.z !== undefined
                        ? child.output.place.z
                        : 0
                );
                positions.push([child.output, place]);
                x = x + child.width;
                x = x + this.padding;

                if (place.x < left) left = place.x;
                if (place.y < bottom) bottom = place.y;
                if (place.x + child.width > right)
                    right = place.x + child.width;
                if (place.y + child.ascent > top) top = place.y + child.ascent;
            }
        }

        return {
            left,
            right,
            top,
            bottom,
            width,
            height,
            places: positions,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: Output[], locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.output.Row.description),
            output.length,
            output.filter((o) => o instanceof Phrase).length,
            output.filter((o) => o instanceof Group).length
        ).toText();
    }
}

export function toRow(value: Value | undefined): Row | undefined {
    if (!(value instanceof StructureValue)) return undefined;
    const alignment = getOutputInput(value, 0);
    const padding = getOutputInput(value, 1);
    return alignment instanceof TextValue && padding instanceof NumberValue
        ? new Row(value, alignment, padding)
        : undefined;
}
