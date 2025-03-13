import { getBind } from '@locale/getBind';
import type Value from '@values/Value';
import toStructure from '../basis/toStructure';
import type Locales from '../locale/Locales';
import Arrangement from './Arrangement';
import type Color from './Color';
import type Output from './Output';
import Phrase from './Phrase';
import Place from './Place';
import type RenderContext from './RenderContext';

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
        for (const child of children) {
            if (child) {
                const layout = child.getLayout(context);
                const place =
                    child instanceof Phrase && child.place
                        ? child.place
                        : new Place(this.value, 0, 0, 0);

                places.push([child, place]);

                if (place.x < left) left = place.x;
                if (place.x + layout.width > right)
                    right = place.x + layout.width;
                if (place.y < bottom) bottom = place.y;
                if (place.y + layout.ascent > top)
                    top = place.y + layout.ascent;
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
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescription(output: Output[], locales: Locales) {
        return locales
            .concretize((l) => l.output.Free.description, output.length)
            .toText();
    }
}

export function toFree(value: Value | undefined): Free | undefined {
    if (value === undefined) return undefined;
    return new Free(value);
}
