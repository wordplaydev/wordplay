import type Unit from '@nodes/Unit';

/**
 * An unbounded numeric property edited via a text field (e.g. a coordinate that can be
 * negative, a distance, a padding, or a compound-unit velocity like m/s), as opposed to
 * OutputPropertyRange's bounded slider.
 */
export default class OutputPropertyNumber {
    /** The unit appended to the value (e.g. meters, or m/s), or an empty unit for a unitless number. */
    readonly unit: Unit;
    readonly precision: number;
    constructor(unit: Unit, precision = 0) {
        this.unit = unit;
        this.precision = precision;
    }
}
