import toStructure from '../native/toStructure';
import type Value from '@runtime/Value';
import type Color from './Color';
import type TypeOutput from './TypeOutput';
import type RenderContext from './RenderContext';
import Place from './Place';
import type LanguageCode from '@locale/LanguageCode';
import { getPreferredLocale } from '@locale/getPreferredLocales';
import { getBind } from '@locale/getBind';
import Arrangement from './Arrangement';
import Phrase from './Phrase';

export const FreeType = toStructure(`
    ${getBind((t) => t.output.Free, '•')} Arrangement()
`);

export class Free extends Arrangement {
    constructor(value: Value) {
        super(value);
    }

    getLayout(children: (TypeOutput | null)[], context: RenderContext) {
        const places: [TypeOutput, Place][] = [];
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
                if (place.y + layout.height > top)
                    top = place.y + layout.height;
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

    getDescription(output: TypeOutput[], languages: LanguageCode[]) {
        return getPreferredLocale(languages).output.Free.description(
            output.length
        );
    }
}

export function toFree(value: Value | undefined): Free | undefined {
    if (value === undefined) return undefined;
    return new Free(value);
}
