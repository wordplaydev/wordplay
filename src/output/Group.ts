import type Decimal from "decimal.js";
import toStructure from "../native/toStructure";
import type Translations from "../nodes/Translations";
import type Value from "../runtime/Value";
import type Color from "./Color";
import Output from "./Output";
import type Place from "./Place";

export const GroupType = toStructure(`
    •Group/eng,▣/😀()
`);

export default abstract class Group extends Output {

    constructor(value: Value) {
        super(value);
    }

    /** Compute the width in meters. */
    abstract getWidth(font: string): Decimal;

    /** Compute the height in meters */
    abstract getHeight(font: string): Decimal;

    abstract getGroups(): Group[];

    /** Compute positions for all subgroups in the group. */
    abstract getPlaces(font: string): [Group, Place][];
    
    abstract getBackground(): Color | undefined;
    abstract getDescriptions(): Translations;

}