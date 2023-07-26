import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import { getBind } from '@locale/getBind';
import Number from '../runtime/Number';
import Arrangement from './Arrangement';
import Group from './Group';
import Phrase from './Phrase';
import concretize from '../locale/concretize';
import type Locale from '../locale/Locale';
import type Project from '../models/Project';

export function createRowType(locales: Locale[]) {
    return toStructure(`
    ${getBind(locales, (t) => t.output.Row, '•')} Arrangement(
        ${getBind(locales, (t) => t.output.Row.padding)}•#m: 1m
    )
`);
}

export class Row extends Arrangement {
    readonly padding: number;

    constructor(value: Value, padding: Number) {
        super(value);

        this.padding = padding.toNumber();
    }

    getLayout(children: (TypeOutput | null)[], context: RenderContext) {
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
        const positions: [TypeOutput, Place][] = [];
        for (const child of layouts) {
            if (child) {
                const place = new Place(
                    this.value,
                    x,

                    child.output.place && child.output.place.y !== undefined
                        ? child.output.place.y
                        : (height - child.height) / 2,
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
                if (place.y + child.height > top) top = place.y + child.height;
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

    getDescription(output: TypeOutput[], locales: Locale[]) {
        return concretize(
            locales[0],
            locales[0].output.Row.description,
            output.length,
            output.filter((o) => o instanceof Phrase).length,
            output.filter((o) => o instanceof Group).length
        ).toText();
    }
}

export function toRow(
    project: Project,
    value: Value | undefined
): Row | undefined {
    if (value === undefined) return undefined;
    const padding = value.resolve(
        project.shares.output.row.inputs[0].names.getNames()[0]
    );
    return padding instanceof Number ? new Row(value, padding) : undefined;
}
