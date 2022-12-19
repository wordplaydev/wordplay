import type Pose from "./Pose";
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
import toStructure from "../native/toStructure";
import { toColor } from "./Color";
import { toPlace } from "./Place";
import Decimal from "decimal.js";
import { toDecimal } from "./Verse";
import getTextMetrics from "./getTextMetrics";
import parseRichText from "./parseRichText";
import { toPose as toPose } from "./Pose";
import type Sequence from "./Sequence";
import { PX_PER_METER, sizeToPx } from "./phraseToCSS";
import { toSequence, type SequenceKind } from "./Sequence";
import type Animation from "./Animation";

export const PhraseType = toStructure(`
    •Phrase/eng,💬/😀 Group(
        text/eng,✍︎/😀•""|[""]
        size/eng,${TRANSLATE}size/😀•#m: 1m
        font/eng,🔡/😀•${SupportedFontsType}|ø: ø
        color/eng,${TRANSLATE}color/😀•Color|ø: ø
        opacity/eng,${TRANSLATE}opacity/😀•%|ø: ø
        place/eng,${TRANSLATE}place/😀•Place|ø: ø
        offset/eng,${TRANSLATE}offset/😀•Place|ø: ø
        rotation/eng,${TRANSLATE}rotation/😀•#°|ø: ø
        scalex/eng,${TRANSLATE}scalex/😀•#|ø: ø
        scaley/eng,${TRANSLATE}scaley/😀•#|ø: ø
        name/eng•""|ø: ø
        entry/eng,${TRANSLATE}entry/😀•ø|Pose|Sequence: ø
        during/eng,${TRANSLATE}during/😀•ø|Pose|Sequence: ø
        between/eng,${TRANSLATE}between/😀•ø|Pose|Sequence: ø
        exit/eng,${TRANSLATE}exit/😀•ø|Pose|Sequence: ø
    )
`)

export default class Phrase extends Group {

    readonly text: TextLang[];
    readonly size: number;
    readonly font: string | undefined;
    readonly color: Color | undefined;
    readonly opacity: number | undefined;
    readonly place: Place | undefined;
    readonly offset: Place | undefined;
    readonly rotation: number | undefined;
    readonly scalex: number | undefined;
    readonly scaley: number | undefined;
    readonly name: TextLang | undefined;
    readonly entry: Pose | Sequence | undefined;
    readonly during: Pose | Sequence | undefined;
    readonly between: Pose | Sequence | undefined;
    readonly exit: Pose | Sequence | undefined;

    _metrics: {
        width: number,
        ascent: number
    } | undefined = undefined;

    constructor(
        value: Value, 
        text: TextLang[], 
        size: number,
        font: string | undefined = undefined, 
        color: Color | undefined = undefined, 
        opacity: number | undefined = undefined, 
        place: Place | undefined = undefined,
        offset: Place | undefined = undefined,
        rotation: number | undefined = undefined,
        scalex: number | undefined = undefined,
        scaley: number | undefined = undefined,
        name: TextLang | undefined = undefined,
        entry: Pose | Sequence | undefined = undefined, 
        during: Pose | Sequence | undefined = undefined,
        between: Pose | Sequence | undefined = undefined,
        exit: Pose | Sequence | undefined = undefined
    ) {

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
        this.name = name;
        this.entry = entry;
        this.during = during;
        this.between = between;
        this.exit = exit;
            
        // Make sure this font is loaded. This is a little late -- we could do some static analysis
        // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
        if(this.font)
            Fonts.loadFamily(this.font);

    }

    getMetrics(context: RenderContext) {

        // See if any moves are animating this.
        const animation = context.animations.get(this);

        // Return the cache, if there is one.
        if(this._metrics && animation === undefined) return this._metrics;
        
        // The font is:
        // 1) the animated font, if there is one
        // 2) this phrase's font, if there is one
        // 3) otherwise, the verse's font.
        const animatedFont = animation?.moves.font?.value as string | undefined;
        const renderedFont = animatedFont ?? this.font ?? context.font;

        // The size is:
        // 1) the animated size, if there is one
        // 2) otherwise, the phrase's size
        const animatedSize = animation?.moves.size?.value as number | undefined;
        const renderedSize = animatedSize ?? this.size;

        // Get the preferred text
        const text = animation?.moves.text ? (animation.moves.text.value as string) : selectTranslation(this.getDescriptions(), context.languages);

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
                `${format.weight ?? ""} ${format.italic ? "italic" : ""} ${sizeToPx(renderedSize)} ${renderedFont}`
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
        if(ascent && Fonts.isLoaded(renderedFont))
            this._metrics = dimensions;
        
        // Return the current dimensions.
        return dimensions;

    }

    getName(): string {
        return this.name?.text ?? Number(this.value.id).toString();
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

    /** Get the kind of sequence requested from the phrase and wrap it in a sequence if it's just a lonely pose. */
    getSequence(kind: SequenceKind) {

        const sequence = this[kind];
        return sequence === undefined ? undefined : sequence.asSequence();

    }

    willLoop(animation: Animation) {

        const sequence = this.getSequence(animation.kind);
        // No longer a sequence on this animation? No looping.
        if(sequence === undefined) return;
        const currentSequence = sequence.getSequenceOfPose(animation.currentPose);
        const nextPoseInSequence = currentSequence?.getNextPose(animation.currentPose);
    
        // If this specific sequence is over, but has more iterations, do another cycle.
        const firstInCurrent = currentSequence?.getFirstPose();
        const iterations = currentSequence ? animation.iterations.get(currentSequence) : undefined;
        
        return iterations !== undefined && currentSequence && nextPoseInSequence === undefined && iterations < currentSequence.count && firstInCurrent !== undefined;
    
    }

    toString() { return this.text[0].text; }

}

export function toFont(value: Value | undefined): string | undefined {

    return value instanceof Text ? value.text : undefined;

}

export function toPhrase(value: Value | undefined): Phrase | undefined {

    if(value === undefined) return undefined;

    let texts = toTextLang(value.resolve("text")); 
    const size = toDecimal(value.resolve("size"))?.toNumber() ?? 1;
    const font = toFont(value.resolve("font"));
    const color = toColor(value.resolve("color"));
    const opacity = toDecimal(value.resolve("opacity"))?.toNumber() ?? 1;
    const place = toPlace(value.resolve("place"));
    const offset = toPlace(value.resolve("offset"));
    const rotation = toDecimal(value.resolve("rotation"))?.toNumber() ?? 0;
    const scalex = toDecimal(value.resolve("scalex"))?.toNumber() ?? 1;
    const scaley = toDecimal(value.resolve("scaley"))?.toNumber() ?? 1;
    const name = toText(value.resolve("name"));
    const entry = toPose(value.resolve("entry")) ?? toSequence(value.resolve("entry"));
    const during = toPose(value.resolve("during")) ?? toSequence(value.resolve("during"));
    const between = toPose(value.resolve("between")) ?? toSequence(value.resolve("between"));
    const exit = toPose(value.resolve("exit")) ?? toSequence(value.resolve("exit"));
    
    return texts ? new Phrase(
        value, 
        texts, 
        size, 
        font, 
        color, 
        opacity, 
        place, 
        offset, 
        rotation, 
        scalex, 
        scaley, 
        name, 
        entry, 
        during, 
        between, 
        exit
    ) : undefined;

}

function toText(value: Value | undefined) {
    return value instanceof Text ? new TextLang(value, value.text, value.format) : undefined;
}

export function toTextLang(value: Value | undefined) {

    let texts = 
        value instanceof Text ? [ new TextLang(value, value.text, value.format) ] :
        value instanceof List && value.values.every(t => t instanceof Text) ? (value.values as Text[]).map(val => new TextLang(val, val.text, val.format)) :
        undefined;

    return texts;

}