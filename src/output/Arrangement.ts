import toStructure from '../native/toStructure';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type Value from '@runtime/Value';
import { getBind } from '@translation/getBind';
import Output from './Output';
import type RenderContext from './RenderContext';
import type Decimal from 'decimal.js';
import type Place from './Place';
import type TypeOutput from './TypeOutput';
import type LanguageCode from '@translation/LanguageCode';
import type { Description } from '@translation/Translation';

export const ArrangementType = toStructure(`
    ${getBind((t) => t.output.arrangement.definition, TYPE_SYMBOL)}()
`);

export default abstract class Arrangement extends Output {
    constructor(value: Value) {
        super(value);
    }

    /** Compute the width in meters. */
    abstract getWidth(output: TypeOutput[], context: RenderContext): Decimal;

    /** Compute the height in meters */
    abstract getHeight(output: TypeOutput[], context: RenderContext): Decimal;

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
