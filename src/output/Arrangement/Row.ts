import { getBind } from '@locale/getBind';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import StructureValue from '@values/StructureValue';
import type Alignment from '@output/Output/Alignment';

/** Where a row lines its children up. `_` is the baseline, which only a Row has:
 *  a stack's cross axis is horizontal, and a baseline is a horizontal line. */
export const BaselineAlignment = '_';
export type RowAlignment = Alignment | typeof BaselineAlignment;

/** The alignment a text value names, or centred for anything else. */
function toRowAlignment(value: TextValue): RowAlignment {
    const text = value.text;
    return text === '<' || text === '|' || text === '>' || text === '_'
        ? text
        : '|';
}
import Arrangement from '@output/Arrangement/Arrangement';
import type Color from '@output/Color/Color';
import type Output from '@output/Output/Output';
import Place, { reflectX } from '@output/Place/Place';
import type RenderContext from '@output/RenderContext';
import { getOutputInput } from '@output/Output/Valued';

export function createRowType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Row, '•')} Arrangement(
        ${getBind(
            locales,
            (locale) => locale.output.Row.alignment,
        )}•'<'|'|'|'>'|'${BaselineAlignment}': '|'
        ${getBind(locales, (locale) => locale.output.Row.padding)}•#m: 1m
    )
`);
}

export class Row extends Arrangement {
    readonly alignment: RowAlignment;
    readonly padding: number;

    constructor(value: Value, alignment: TextValue, padding: NumberValue) {
        super(value);

        this.alignment = toRowAlignment(alignment);
        this.padding = padding.toNumber();
    }

    getLayout(children: (Output | null)[], context: RenderContext) {
        // Layout the children.
        const layouts = children.map((child) =>
            child === null ? null : child.getLayout(context),
        );

        // Only children with a footprint are padded apart: a Music or Say in the
        // row is heard, not seen, so giving it a gap would open a meter of empty
        // space around nothing.
        const spaced = layouts.filter(
            (layout) => layout !== null && layout.output.occupiesSpace(),
        );

        // Width is the some of the child widths plus padding between
        const width =
            layouts.reduce(
                (width, layout) => width + (layout === null ? 0 : layout.width),
                0,
            ) +
            this.padding * Math.max(0, spaced.length - 1);

        // Get the height of the container so we can center each phrase vertically.
        const boxHeight = layouts.reduce(
            (max, layout) => Math.max(max, layout === null ? 0 : layout.height),
            0,
        );

        // Aligning baselines is not aligning boxes: a phrase's box is its ink,
        // so `a` and `b` at the same y sit on different baselines. Each child is
        // raised by the difference between the deepest baseline in the row and
        // its own, and the row is as tall as the tallest thing above the shared
        // baseline plus the deepest below it.
        const baselines =
            this.alignment === BaselineAlignment
                ? layouts.map((layout) =>
                      layout === null
                          ? undefined
                          : layout.output.getBaselineOffset(context),
                  )
                : [];
        const deepest = baselines.reduce(
            (max: number, offset) => Math.max(max, offset ?? 0),
            0,
        );
        const tallest = layouts.reduce((max, layout, index) => {
            if (layout === null) return max;
            return Math.max(max, layout.height - (baselines[index] ?? 0));
        }, 0);
        const height =
            this.alignment === BaselineAlignment
                ? tallest + deepest
                : boxHeight;

        // Under an RTL project locale, lay children out from the inline-end
        // (right) edge so reading order flows right-to-left.
        const rtl = context.locales.getDirection() === 'rtl';

        let x = 0;
        let left = 0,
            top = 0,
            right = 0,
            bottom = 0;
        const positions: [Output, Place][] = [];
        // Infinity, not 0: an arrangement has no z of its own — the parent that placed
        // this group does — so with no children there is nothing to report.
        let nearest = Infinity;
        // Padding is applied before each spaced child after the first, rather than
        // after every child: trailing a footprintless child with a gap would push
        // it past the row's own bounds.
        let spacedSoFar = 0;
        // Layout each child from start to end.
        for (const child of layouts) {
            if (child) {
                if (child.output.occupiesSpace()) {
                    if (spacedSoFar > 0) x = x + this.padding;
                    spacedSoFar++;
                }
                // Reflect the start-to-end cursor to its mirror under RTL.
                const childX = rtl ? reflectX(x, child.width, width) : x;
                const baseline =
                    this.alignment === BaselineAlignment
                        ? child.output.getBaselineOffset(context)
                        : undefined;
                const place = new Place(
                    this.value,
                    // Current x position
                    childX,
                    // If a y is specified, use it.
                    child.output.place && child.output.place.y !== undefined
                        ? child.output.place.y
                        : // Lining up baselines: raise this child by however much
                          // shallower its baseline is than the row's deepest.
                          // Anything with no baseline — a shape, a group, a
                          // vertical phrase — falls through to the bottom, since
                          // a baseline only ever pairs with another baseline.
                          this.alignment === BaselineAlignment
                          ? deepest - (baseline ?? 0)
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
                        : 0,
                );
                positions.push([child.output, place]);
                x = x + child.width;

                if (childX < left) left = childX;
                if (place.y < bottom) bottom = place.y;
                if (childX + child.width > right) right = childX + child.width;
                if (place.y + child.ascent > top) top = place.y + child.ascent;
                // Both the child's own z and whatever it reports from inside itself,
                // since z is absolute rather than relative to this arrangement.
                if (place.z < nearest) nearest = place.z;
                if (child.nearest < nearest) nearest = child.nearest;
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
            nearest,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: Output[], locales: Locales) {
        return locales
            .concretize((l) => l.output.Row.description, {
                count: output.length,
            })
            .toText();
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
