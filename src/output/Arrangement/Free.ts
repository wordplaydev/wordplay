import { getBind } from '@locale/getBind';
import type Value from '@values/Value';
import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import Arrangement from '@output/Arrangement/Arrangement';
import type Color from '@output/Color/Color';
import type Output from '@output/Output/Output';
import Place from '@output/Place/Place';
import type RenderContext from '@output/RenderContext';

export function createFreeType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Free, '•')} Arrangement()
`);
}

export class Free extends Arrangement {
    constructor(value: Value) {
        super(value);
    }

    getLayout(children: (Output | null)[], context: RenderContext) {
        const places: [Output, Place][] = [];
        let left = 0,
            right = 0,
            bottom = 0,
            top = 0;
        // Infinity, not 0: an arrangement has no z of its own — the parent that placed
        // this group does — so with no children there is nothing to report.
        let nearest = Infinity;
        for (const child of children) {
            if (child) {
                const layout = child.getLayout(context);
                // Free arranges nothing, so any child sits where it says —
                // including a shape, whose form's coordinates are its position.
                // It honoured only a phrase for years, which its own doc never
                // claimed and which left every other kind stacked at the origin.
                const place = child.place ?? new Place(this.value, 0, 0, 0);

                places.push([child, place]);

                if (place.x < left) left = place.x;
                if (place.x + layout.width > right)
                    right = place.x + layout.width;
                if (place.y < bottom) bottom = place.y;
                if (place.y + layout.ascent > top)
                    top = place.y + layout.ascent;
                // Both the child's own z and whatever it reports from inside itself,
                // since z is absolute rather than relative to this arrangement.
                if (place.z < nearest) nearest = place.z;
                if (layout.nearest < nearest) nearest = layout.nearest;
            }
        }

        return {
            output: this,
            left,
            right,
            top,
            bottom,
            width: right - left,
            height: top - bottom,
            places,
            nearest,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: Output[], locales: Locales) {
        return locales
            .concretize((l) => l.output.Free.description, {
                count: output.length,
            })
            .toText();
    }
}

export function toFree(value: Value | undefined): Free | undefined {
    if (value === undefined) return undefined;
    return new Free(value);
}
