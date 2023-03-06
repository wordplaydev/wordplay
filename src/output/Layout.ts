import toStructure from '../native/toStructure';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type Value from '@runtime/Value';
import { getBind } from '@translation/getBind';
import Output from './Output';
import type RenderContext from './RenderContext';
import type Place from './Place';
import type TypeOutput from './TypeOutput';
import type LanguageCode from '@translation/LanguageCode';
import type { Description } from '@translation/Translation';

export const ArrangementType = toStructure(`
    ${getBind((t) => t.output.layout.definition, TYPE_SYMBOL)}()
`);

export default abstract class Layout extends Output {
    constructor(value: Value) {
        super(value);
    }

    /** Compute the width in meters. */
    abstract getWidth(output: TypeOutput[], context: RenderContext): number;

    /** Compute the height in meters */
    abstract getHeight(output: TypeOutput[], context: RenderContext): number;

    /** Compute positions for all subgroups in the group. */
    abstract getPlaces(
        output: TypeOutput[],
        context: RenderContext
    ): [TypeOutput, Place][];

    abstract getDescription(
        output: TypeOutput[],
        languages: LanguageCode[]
    ): Description;
}
