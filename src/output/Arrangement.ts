import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type Value from '@values/Value';
import toStructure from '../basis/toStructure';
import type Locales from '../locale/Locales';
import type Output from './Output';
import type Place from './Place';
import type RenderContext from './RenderContext';
import Valued from './Valued';

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
    };

    abstract getDescription(
        output: (Output | null)[],
        locales: Locales,
    ): string;
}
