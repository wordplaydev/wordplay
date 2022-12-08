import type Transition from "./Transition";
import type Value from "../runtime/Value";
import type Color from "./Color";
import { SupportedFontsType } from "../native/Fonts";
import Text from "../runtime/Text";
import Group from "./Group";
import type Place from "./Place";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import List from "../runtime/List";
import TextLang from "./TextLang";
import type Translations from "../nodes/Translations";
import { toTransition } from "./toTransition";
import toStructure from "../native/toStructure";
import { toColor } from "./Color";
import { toPlace } from "./Place";

export const PhraseType = toStructure(`
    •Phrase/eng,💬/😀•Group(
        text/eng,✍︎/😀•""•[""]
        font/eng,🔡/😀•ø${SupportedFontsType}: ø
        color/eng,${TRANSLATE}color•Color•ø: ø
        place/eng,${TRANSLATE}place•Place•ø: ø
        in/eng,${TRANSLATE}in/😀•Transition•ø:ø
        out/eng,${TRANSLATE}in/😀•Transition•ø:ø
`)

export default class Phrase extends Group {

    readonly text: TextLang[];
    readonly font: string | undefined;
    readonly color: Color | undefined;
    readonly place: Place | undefined;
    readonly in: Transition | undefined;
    readonly out: Transition | undefined;

    constructor(
        value: Value, 
        text: TextLang[], 
        font: string | undefined = undefined, 
        color: Color | undefined = undefined, 
        place: Place | undefined = undefined,
        inn: Transition | undefined = undefined, 
        out: Transition | undefined = undefined) {

        super(value);

        this.text = text;
        this.color = color;
        this.font = font;
        this.place = place;
        this.in = inn;
        this.out = out;
            
    }

    getGroups(): Group[] { return []; }
    getPlaces(): Place[] { return [];}

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescriptions(): Translations {
        return WRITE_DOCS;   
    }

}

export function toFont(value: Value | undefined): string | undefined {

    return value instanceof Text ? value.text : undefined;

}

export function toPhrase(value: Value | undefined): Phrase | undefined {

    if(value === undefined) return undefined;

    let text = value.resolve("text");
    let texts = 
        text instanceof Text ? [ new TextLang(text, text.text, text.format) ] :
        text instanceof List && text.values.every(t => t instanceof Text) ? (text.values as Text[]).map(val => new TextLang(val, val.text, val.format)) :
        undefined;
    const font = toFont(value.resolve("font"));
    const color = toColor(value.resolve("color"));
    const place = toPlace(value.resolve("place"));
    const inn = toTransition(value.resolve("in"));
    const out = toTransition(value.resolve("in"));

    return texts ? new Phrase(value, texts, font, color, place, inn, out) : undefined;

}