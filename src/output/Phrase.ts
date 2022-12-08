import type Transition from "./Transition";
import type Value from "../runtime/Value";
import type Color from "./Color";
import { Fonts, SupportedFontsType } from "../native/Fonts";
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
import Decimal from "decimal.js";
import { toDecimal } from "./Verse";

export const PhraseType = toStructure(`
    •Phrase/eng,💬/😀•Group(
        text/eng,✍︎/😀•""•[""]
        size/eng,${TRANSLATE}size/😀•#m: 1m
        font/eng,🔡/😀${SupportedFontsType}•ø: ø
        color/eng,${TRANSLATE}color/😀•Color•ø: ø
        place/eng,${TRANSLATE}place/😀•Place•ø: ø
        in/eng,${TRANSLATE}in/😀•Transition•ø:ø
        out/eng,${TRANSLATE}in/😀•Transition•ø:ø
`)

export default class Phrase extends Group {

    readonly text: TextLang[];
    readonly size: Decimal;
    readonly font: string | undefined;
    readonly color: Color | undefined;
    readonly place: Place | undefined;
    readonly in: Transition | undefined;
    readonly out: Transition | undefined;

    _metrics: TextMetrics | null = null;

    constructor(
        value: Value, 
        text: TextLang[], 
        size: Decimal,
        font: string | undefined = undefined, 
        color: Color | undefined = undefined, 
        place: Place | undefined = undefined,
        inn: Transition | undefined = undefined, 
        out: Transition | undefined = undefined) {

        super(value);

        this.text = text;
        this.color = color;
        this.size = size;
        this.font = font;
        this.place = place;
        this.in = inn;
        this.out = out;
            
        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if(this.font)
            Fonts.loadFamily(this.font);

    }

    getMetrics(font: string) {

        // There are almost certainly faster ways to do this. I'm going to do this here for now
        // and save this for a performance task later.
        if(this._metrics === null) {
            const canvas = document.createElement("canvas");
            document.body.appendChild(canvas);
            const context = canvas.getContext("2d");
            if(context === null) return null;
            context.font = `${sizeToPx(this.size)} ${this.font ?? font}`;
            this._metrics = context.measureText(this.text[0].text);
            document.body.removeChild(canvas);
        }
        return this._metrics;

    }

    getWidth(font: string): Decimal { 
        // Metrics is in pixels; convert to meters.
        return new Decimal(this.getMetrics(font)?.width ?? 0).div(PX_PER_METER);
    }

    getHeight(font: string): Decimal { 
        return new Decimal(this.getMetrics(font)?.fontBoundingBoxAscent ?? 0).div(PX_PER_METER);
    }

    getGroups(): Group[] { return []; }
    getPlaces(): [Group, Place][] { return []; }

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
    const size = toDecimal(value.resolve("size")) ?? new Decimal(1);
    const font = toFont(value.resolve("font"));
    const color = toColor(value.resolve("color"));
    const place = toPlace(value.resolve("place"));
    const inn = toTransition(value.resolve("in"));
    const out = toTransition(value.resolve("in"));

    return texts ? new Phrase(value, texts, size, font, color, place, inn, out) : undefined;

}

const PX_PER_METER = new Decimal(14);

export function sizeToPx(size: Decimal): string { return `${size.times(PX_PER_METER)}px`; }