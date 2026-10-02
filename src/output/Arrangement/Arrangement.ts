import { getBind } from '#locale/getBind.ts';
import { TYPE_SYMBOL } from '#parser/Symbols.ts';
import type Value from '#values/Value.ts';
import toStructure from '#basis/toStructure.ts';
import type Locales from '#locale/Locales.ts';
import type Output from '#output/Output/Output.ts';
import type Place from '#output/Place/Place.ts';
import type RenderContext from '#output/RenderContext.ts';
import Valued from '#output/Output/Valued.ts';

export function createArrangementType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Arrangement, TYPE_SYMBOL)}()
`);
}

export default abstract class Arrangement extends Valued {
    constructor(value: Value) {
        super(value);
    }

    /** Compute positions for all subgroups in the group. */
    abstract getLayout(
        output: (Output | null)[],
        context: RenderContext,
    ): {
        left: number;
        top: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
        places: [Output, Place][];
        /** The nearest z of anything arranged here; see `Output.getLayout`. */
        nearest: number;
    };

    abstract getDescription(
        output: (Output | null)[],
        locales: Locales,
    ): string;
}
