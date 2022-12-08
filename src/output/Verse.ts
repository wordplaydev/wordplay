import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import Group from "./Group";
import { toFont } from "./Phrase";
import { Fonts, SupportedFontsType } from "../native/Fonts";
import type Color from "./Color";
import Place from "./Place";
import type Translations from "../nodes/Translations";
import toStructure from "../native/toStructure";
import Measurement from "../runtime/Measurement";
import Decimal from "decimal.js";
import { toGroup } from "./toGroups";

export const VerseType = toStructure(`
    •Verse/eng,🌎/😀•Group(
        group/eng,${TRANSLATE}phrases/😀•Group
        font/eng,${TRANSLATE}font/😀${SupportedFontsType}: "Noto Sans"
    )
`);

export default class Verse extends Group {

    readonly group: Group;
    readonly font: string;

    constructor(value: Value, group: Group, font: string = "Noto Sans") {

        super(value);

        this.group = group;
        this.font = font;

        Fonts.loadFamily(this.font);

    }

    getWidth(): Decimal { return this.group.getWidth(this.font); }
    getHeight(): Decimal { return this.group.getHeight(this.font); }

    getGroups(): Group[] {
        return [ this.group ];
    }

    /** 
     * A Verse is a Group that lays out a list of phrases according to their specified places,
     * or if the phrases */
    getPlaces(): [Group, Place][] {
        // Center the group in the verse.
        return [
            [ 
                this.group, 
                new Place(this.value, 
                    this.group.getWidth(this.font).div(2).neg(), 
                    this.group.getHeight(this.font).div(2).neg(), 
                    new Decimal(0)
                ) 
            ]
        ];
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescriptions(): Translations {
        return WRITE_DOCS
    }

}

export function toVerse(value: Value): Verse | undefined {

    if(!(value instanceof Structure)) return undefined;

    if(value.type === VerseType) {
        const group = toGroup(value.resolve("group"));
        const font = toFont(value.resolve("font"));
        return group && font ? new Verse(value, group, font) : undefined;
    }
     // Try converting it to a group.
    else {
        const group = toGroup(value);
        return group === undefined ? undefined : new Verse(value, group);
    }

}

export function toDecimal(value: Value | undefined): Decimal | undefined {

    return value instanceof Measurement ? value.num : undefined;

}