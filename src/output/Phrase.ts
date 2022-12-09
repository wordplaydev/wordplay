import type Transition from "./Transition";
import type Value from "../runtime/Value";
import type Color from "./Color";
import Fonts, { SupportedFontsType } from "../native/Fonts";
import Text from "../runtime/Text";
import Group, { type RenderContext } from "./Group";
import type Place from "./Place";
import { selectTranslation, TRANSLATE } from "../nodes/Translations";
import List from "../runtime/List";
import TextLang from "./TextLang";
import type Translations from "../nodes/Translations";
import { toTransition } from "./toTransition";
import toStructure from "../native/toStructure";
import { toColor } from "./Color";
import { toPlace } from "./Place";
import Decimal from "decimal.js";
import { toDecimal } from "./Verse";
import getTextMetrics from "./getTextMetrics";
import parseRichText from "./parseRichText";

export const PhraseType = toStructure(`
    •Phrase/eng,💬/😀•Group(
        text/eng,✍︎/😀•""•[""]
        size/eng,${TRANSLATE}size/😀•#m: 1m
        font/eng,🔡/😀${SupportedFontsType}•ø: ø
        color/eng,${TRANSLATE}color/😀•Color•ø: ø
        opacity/eng,${TRANSLATE}opacity/😀•#%•ø: ø
        place/eng,${TRANSLATE}place/😀•Place•ø: ø
        offset/eng,${TRANSLATE}offset/😀•Place•ø: ø
        rotation/eng,${TRANSLATE}rotation/😀•#°•ø: ø
        scalex/eng,${TRANSLATE}scalex/😀•#•ø: ø
        scaley/eng,${TRANSLATE}scaley/😀•#•ø: ø
        in/eng,${TRANSLATE}in/😀•Transition•ø: ø
        out/eng,${TRANSLATE}out/😀•Transition•ø: ø
`)

export default class Phrase extends Group {

    readonly text: TextLang[];
    readonly size: Decimal;
    readonly font: string | undefined;
    readonly color: Color | undefined;
    readonly opacity: Decimal | undefined;
    readonly place: Place | undefined;
    readonly offset: Place | undefined;
    readonly rotation: Decimal | undefined;
    readonly scalex: Decimal | undefined;
    readonly scaley: Decimal | undefined;
    readonly in: Transition | undefined;
    readonly out: Transition | undefined;

    _metrics: {
        width: number,
        ascent: number
    } | undefined = undefined;

    constructor(
        value: Value, 
        text: TextLang[], 
        size: Decimal,
        font: string | undefined = undefined, 
        color: Color | undefined = undefined, 
        opacity: Decimal | undefined = undefined, 
        place: Place | undefined = undefined,
        offset: Place | undefined = undefined,
        rotation: Decimal | undefined = undefined,
        scalex: Decimal | undefined = undefined,
        scaley: Decimal | undefined = undefined,
        inn: Transition | undefined = undefined, 
        out: Transition | undefined = undefined) {

        super(value);

        this.text = text;
        this.size = size;
        this.font = font;
        this.color = color;
        this.opacity = opacity;
        this.place = place;
        this.offset = offset;
        this.rotation = rotation;
        this.scalex = scalex;
        this.scaley = scaley;
        this.in = inn;
        this.out = out;
            
        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if(this.font)
            Fonts.loadFamily(this.font);

    }

    getMetrics(render: RenderContext) {

        // Return the cache, if there is one.
        if(this._metrics) return this._metrics;

        // The font is this phrase's font, or if there isn't an override, the verse's font.
        const family = this.font ?? render.font;

        // Get the preferred text
        const text = selectTranslation(this.getDescriptions(), render.languages);

        // Parse the text as rich text nodes.
        const rich = parseRichText(text);

        // Get the formats of the rich text
        const formats = rich.getTextFormats();

        // Figure out a width.
        let width = 0;
        let ascent: undefined | number = undefined;

        // Get the list of text nodes and the formats applied to each
        for(const [ text, format ] of formats) {

            // Parse the text into rich text nodes.
            const metrics = getTextMetrics(
                // Choose the description with the preferred language.
                text.text,
                // Convert the size to pixels and choose a font name.
                `${format.weight ?? ""} ${format.italic ? "italic" : ""} ${sizeToPx(this.size)} ${family}`
            );

            if(metrics) {
                width += metrics.width;
                ascent = metrics.fontBoundingBoxAscent;
            }

        }

        const dimensions = {
            width: width,
            ascent: ascent ?? 0
        }
        // If the font is loaded, these metrics can be trusted, so we cache them.
        if(ascent && Fonts.isLoaded(family))
            this._metrics = dimensions;
        
        // Return the current dimensions.
        return dimensions;

    }

    getWidth(context: RenderContext): Decimal { 
        // Metrics is in pixels; convert to meters.
        return new Decimal(this.getMetrics(context).width).div(PX_PER_METER);
    }

    getHeight(context: RenderContext): Decimal { 
        return new Decimal(this.getMetrics(context).ascent).div(PX_PER_METER);
    }

    getGroups(): Group[] { return []; }
    getPlaces(): [Group, Place][] { return []; }

    getBackground(): Color | undefined {
        return undefined;
    }

    getDescriptions(): Translations {
        const translations: Record<string,string> = {};
        for(const text of this.text)
            translations[text.lang ?? ""] = text.text;
        return translations as Translations;
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
    const opacity = toDecimal(value.resolve("opacity"));
    const place = toPlace(value.resolve("place"));
    const offset = toPlace(value.resolve("offset"));
    const rotation = toDecimal(value.resolve("rotation"));
    const scalex = toDecimal(value.resolve("scalex"));
    const scaley = toDecimal(value.resolve("scaley"));
    const inn = toTransition(value.resolve("in"));
    const out = toTransition(value.resolve("out"));

    return texts ? new Phrase(value, texts, size, font, color, opacity, place, offset, rotation, scalex, scaley, inn, out) : undefined;

}

const PX_PER_METER = new Decimal(16);

export function sizeToPx(size: Decimal): string { return `${size.times(PX_PER_METER)}px`; }