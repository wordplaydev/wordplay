import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import Structure from "../runtime/Structure";
import type Value from "../runtime/Value";
import Group, { toGroup, toGroups as toGroups } from "./Group";
import { PhraseType, toFont, toPhrase } from "./Phrase";
import { SupportedFontsType } from "../native/Fonts";
import type Color from "./Color";
import type Place from "./Place";
import type Translations from "../nodes/Translations";
import toStructure from "../native/toStructure";
import Measurement from "../runtime/Measurement";
import type Decimal from "decimal.js";

export const VerseType = toStructure(`
    •Verse/eng,🌎/😀•Group(
        group/eng,${TRANSLATE}phrases/😀•Group
        font/eng,${TRANSLATE}font/😀•${SupportedFontsType}: "Noto Sans"
    )
`);

export default class Verse extends Group {

    readonly group: Group;
    readonly font: string;

    constructor(value: Value, group: Group, font: string = "Noto Sans") {

        super(value);

        this.group = group;
        this.font = font;

    }

    getGroups(): Group[] {
        return [ this.group ];
    }

    /** 
     * A Verse is a Group that lays out a list of phrases according to their specified places,
     * or if the phrases */
    getPlaces(): Place[] {

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

    switch(value.type) {
        case VerseType: 
            const group = toGroup(value.resolve("group"));
            const font = toFont(value.resolve("font"));
            return group && font ? new Verse(value, group, font) : undefined;
        case PhraseType: 
            const phrase = toPhrase(value);
            return phrase === undefined ? undefined : new Verse(value, phrase); 

    }
    return undefined;

}

export function toDecimal(value: Value | undefined): Decimal | undefined {

    return value instanceof Measurement ? value.num : undefined;

}