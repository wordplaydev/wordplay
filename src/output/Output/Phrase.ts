import {
    HorizontalLayout,
    VerticalLeftRightLayout,
    VerticalRightLeftLayout,
    layoutToCSS,
    type WritingLayout,
    type WritingLayoutSymbol,
} from '@locale/Scripts';
import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import MarkupValue from '@values/MarkupValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import { describeColorLocalized } from '@output/Color/BasicColors';
import { describeFaceWithName } from '@basis/faces/faceWords';
import Fonts, {
    SupportedFontsFamiliesType,
    type FontWeight,
    type SupportedFace,
} from '@basis/faces/Fonts';
import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Markup from '@nodes/Markup';
import StructureValue from '@values/StructureValue';
import type Aura from '@output/Aura/Aura';
import { toAura } from '@output/Aura/Aura';
import type Bubble from '@output/Bubble/Bubble';
import { toBubble } from '@output/Bubble/Bubble';
import type Color from '@output/Color/Color';
import type Matter from '@output/physics/Matter';
import { toMatter } from '@output/physics/Matter';
import Output, { DefaultStyle } from '@output/Output/Output';
import type Place from '@output/Place/Place';
import type { DefinitePose } from '@output/animation/Pose';
import Pose from '@output/animation/Pose';
import type RenderContext from '@output/RenderContext';
import Sequence from '@output/animation/Sequence';
import { toNumber, type NameGenerator } from '@output/Output/Stage';
import { splitCharacterRefs } from '@output/Output/splitCharacterRefs';
import { getOutputInput } from '@output/Output/Valued';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { getTypeStyle } from '@output/Output/toOutput';
import measureFormats from '@output/Output/measureFormats';
import measureBubble, { type BubbleBox } from '@output/Bubble/bubbleLayout';

export function createPhraseType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Phrase, TYPE_SYMBOL)} Output(
        ${getBind(locales, (locale) => locale.output.Phrase.text)}•""|\`…\`
        ${getBind(locales, (locale) => locale.output.Phrase.size)}•${'#m|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.face,
        )}•${SupportedFontsFamiliesType}${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.place)}•📍|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.name)}•""|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.description,
        )}•""|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.selectable)}•?: ⊥
        ${getBind(locales, (locale) => locale.output.Phrase.color)}•🌈${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.background,
        )}•Color${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.opacity,
        )}•%${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.offset)}•📍|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.rotation,
        )}•#°${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.scale)}•#${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.flipx)}•?${'|ø: ø'}
        ${getBind(locales, (locale) => locale.output.Phrase.flipy)}•?${'|ø: ø'}
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.entering,
        )}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.resting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.moving)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.exiting)}•ø|🤪|💃: ø
        ${getBind(locales, (locale) => locale.output.Phrase.changing)}•ø|${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.TextEffect).map(
                    (id) => `"${id}"/${locale.language}`,
                ),
            )
            .flat()
            .join('|')}: ø
        ${getBind(locales, (locale) => locale.output.Phrase.duration)}•#s: 0.25s
        ${getBind(locales, (locale) => locale.output.Phrase.style)}•${locales
            .getLocales()
            .map((locale) =>
                Object.values(locale.output.Easing).map(
                    (id) => `"${id}"/${locale.language}`,
                ),
            )
            .flat()
            .join('|')}: "${DefaultStyle}"
        ${getBind(locales, (locale) => locale.output.Phrase.wrap)}•#m|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.alignment,
        )}•'<'|'|'|'>': '<'
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.direction,
        )}•'${HorizontalLayout}'|'${VerticalRightLeftLayout}'|'${VerticalLeftRightLayout}'|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.matter)}•Matter|ø: ø
        ${getBind(locales, (locale) => locale.output.Phrase.aura)}•ø|🔮: ø
        ${getBind(
            locales,
            (locale) => locale.output.Phrase.bubble,
        )}•ø|""|\`…\`|🔊|🗨: ø
    )`);
}

export type Metrics = {
    /** The pixel width of the rendered text in its font and style. */
    width: number;
    /** The pixel height of the very top of the rendered text to its rendered bottom. */
    height: number;
    /** The pixel ascent of the font. */
    ascent: number;
    /** The pixel descent of the font. */
    descent: number;
};

export default class Phrase extends Output {
    readonly text: TextValue | MarkupValue;
    /** The localized name of the effect to play when the text changes, or undefined for an instant change. */
    readonly changing: string | undefined;
    readonly wrap: number | undefined;
    readonly alignment: string | undefined;
    /** The explicit writing layout, or undefined to inherit the render context's
     *  effective layout (the resolved writingLayout setting). */
    readonly direction: WritingLayoutSymbol | undefined;
    readonly matter: Matter | undefined;
    readonly aura: Aura | undefined;
    readonly bubble: Bubble | undefined;

    private _metrics: Metrics | undefined = undefined;
    /** The effective layout the cached metrics were computed for, so we can
     *  recompute when an inherited (undefined-direction) layout changes. */
    private _metricsLayout: WritingLayout | undefined = undefined;
    /** The font load generation the cached metrics were computed at, so they
     *  recompute when lazily-loaded fonts finish arriving. */
    private _metricsGeneration = -1;
    /** Whether the cached metrics stood in a placeholder, so an empty phrase
     *  re-measures when the palette opens or closes. */
    private _metricsPlaceholders = false;

    /** The bubble's measured box, and the size and face it was measured at.
     *  Separate from `_metrics` because a bubble is sized from the *stage's*
     *  text size rather than the phrase's, so the two are measured against
     *  different numbers and cannot share a cache. */
    private _bubbleBox: BubbleBox | undefined = undefined;
    private _bubbleSize: number | undefined = undefined;
    private _bubbleFace: string | undefined = undefined;
    private _bubbleGeneration = -1;

    private _description: string | undefined = undefined;

    constructor(
        value: StructureValue,
        text: TextValue | MarkupValue,
        size: number | undefined = undefined,
        face: SupportedFace | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextValue | string,
        description: TextValue | undefined = undefined,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entering: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string,
        changing: string | undefined,
        wrap: number | undefined,
        alignment: string | undefined,
        direction: WritingLayoutSymbol | undefined,
        matter: Matter | undefined,
        aura: Aura | undefined,
        bubble: Bubble | undefined,
    ) {
        super(
            value,
            size,
            face,
            place,
            name,
            description,
            selectable,
            background,
            pose,
            entering,
            resting,
            moving,
            exiting,
            duration,
            style,
        );

        this.text = text;
        this.changing = changing;
        this.wrap = wrap === undefined ? undefined : Math.max(1, wrap);
        this.alignment = alignment;
        this.direction = direction;
        this.matter = matter;
        this.aura = aura;
        this.bubble = bubble;
    }

    find(check: (output: Output) => boolean): Output | undefined {
        return check(this) ? this : undefined;
    }

    getText() {
        return (this.value as StructureValue).resolve(
            (this.value as StructureValue).type.inputs[0].names,
        );
    }

    resetMetrics() {
        this._metrics = undefined;
    }

    getMetrics(context: RenderContext, parsed = true) {
        // The effective layout: the Phrase's explicit one, or the render
        // context's inherited layout (the resolved writingLayout setting).
        const layout = this.direction
            ? layoutToCSS(this.direction)
            : context.layout;

        // Return the cache, if there is one, it was computed for this layout,
        // and no fonts have finished loading since it was computed (lazily
        // loaded faces change text dimensions when they arrive).
        if (
            parsed &&
            this._metrics &&
            this._metricsLayout === layout &&
            this._metricsPlaceholders === context.placeholders &&
            this._metricsGeneration === Fonts.getLoadGeneration()
        )
            return this._metrics;

        // The font is:
        // 1) the animated font, if there is one
        // 2) this phrase's font, if there is one
        // 3) otherwise, the verse's font.
        const renderedFace = this.face ?? context.face;

        // The size is: whatever is explicitly set, or whatever is inherited in the context.
        // 1) the explicit
        // 2) otherwise, the phrase's size
        const renderedSize = this.size ?? context.size;

        // Get the text that will be rendered.
        const text = this.getLocalizedTextOrDoc();

        const maxWidth =
            this.wrap === undefined ? undefined : this.wrap * PX_PER_METER;

        const formats: FormattedText[] | undefined =
            // Is it plain text? Split out any custom-character references (#773)
            // so each is measured as one '@', then make a list of unformatted segments.
            text instanceof TextValue
                ? splitCharacterRefs(text.text).map((chunk) => ({
                      text: chunk.kind === 'character' ? chunk.ref : chunk.text,
                      italic: false,
                      weight: undefined,
                  }))
                : // Otherwise, get the list of formatted segments.
                  text?.getFormats();

        // Remember which font load generation these metrics are computed at;
        // when more fonts arrive, the loadingdone event bumps the generation
        // and invalidates the cache above.
        const generation = Fonts.getLoadGeneration();

        // Is the text horizontal or vertical? This determines how we calculate size.
        const horizontal = layout === 'horizontal-tb';

        const measured = measureFormats(formats ?? [], {
            face: renderedFace,
            size: renderedSize,
            maxWidth,
            layout,
            locale: context.locales.getLocaleString(),
        });

        let { width, height } = measured;
        let { ascent, descent } = measured;

        // Wrapping? The width is specified; we just need to compute the height.
        if (maxWidth !== undefined) {
            width = maxWidth;
            height = measured.totalHeight + (width > 0 ? ascent + descent : 0);
        }

        if (!horizontal) {
            const temp = width;
            width = height;
            height = temp;
        }

        // Nothing to measure — an empty phrase has no segments at all — and a creator is
        // editing? Stand in a box the size of the line this phrase is about to become, so
        // it's visible and selectable. It has to be measured rather than painted with a CSS
        // minimum: everything downstream places output from these numbers, so a box the
        // layout thinks is 0x0 lands in a corner instead of centered, and an arrangement
        // holding one leaves no room for it.
        if (width === 0 && height === 0 && context.placeholders) {
            const line = renderedSize * PX_PER_METER;
            width = horizontal ? line / 2 : line;
            height = horizontal ? line : line / 2;
            ascent = height;
            descent = 0;
        }

        const dimensions = { width, height, ascent, descent };
        // Cache the metrics with the layout and font load generation they
        // were computed at; if fonts were still downloading, the next
        // loadingdone event invalidates this cache and they recompute.
        if (height !== undefined && ascent !== undefined) {
            this._metrics = dimensions;
            this._metricsLayout = layout;
            this._metricsPlaceholders = context.placeholders;
            this._metricsGeneration = generation;
        }

        // Return the current dimensions.
        return dimensions;
    }

    getOutput(): Output[] {
        return [];
    }

    /**
     * Where this phrase's text baseline sits above the bottom of its box, in
     * metres — what alignment guides line two phrases up on (#117).
     *
     * Derived from the `line-height` PhraseView actually paints, not from face
     * metrics: `FaceMetrics` carries only x-height over cap-height, which says
     * nothing about where the baseline lands. With a line box of L and font
     * ascent A and descent D, the half-leading is (L - A - D) / 2 and the
     * baseline sits A below the top, so it is (L + D - A) / 2 above the bottom.
     * Wrapped and vertical text set L = A + D exactly, which reduces to D — the
     * last line's baseline, since the lines stack from the top.
     *
     * Undefined for vertical writing, where the baseline runs the other way and
     * a horizontal guide through it would mean nothing.
     */
    getBaselineOffset(context: RenderContext): number | undefined {
        const layout = this.direction
            ? layoutToCSS(this.direction)
            : context.layout;
        if (layout !== 'horizontal-tb') return undefined;
        const { height, ascent, descent } = this.getLayout(context);
        return this.wrap !== undefined
            ? descent
            : (height + descent - ascent) / 2;
    }

    /**
     * How big this phrase's speech bubble is, or undefined without one.
     *
     * Takes the **parent's** render context on purpose. A bubble's font size is
     * the stage's rather than the speaker's — a three metre character does not
     * get three metre dialog — so measuring this against the phrase's own
     * context would give a different answer, and the two callers would disagree
     * about the same bubble depending on which ran first.
     */
    getBubbleBox(context: RenderContext): BubbleBox | undefined {
        if (this.bubble === undefined) return undefined;
        const face = this.face ?? context.face;
        const size = this.bubble.size ?? context.size;
        const generation = Fonts.getLoadGeneration();
        if (
            this._bubbleBox !== undefined &&
            this._bubbleSize === size &&
            this._bubbleFace === face &&
            this._bubbleGeneration === generation
        )
            return this._bubbleBox;
        const box = measureBubble(
            this.bubble,
            face,
            size,
            context.locales.getLocaleString(),
        );
        this._bubbleBox = box;
        this._bubbleSize = size;
        this._bubbleFace = face;
        this._bubbleGeneration = generation;
        return box;
    }

    getPinnedBubbleSide() {
        return this.bubble?.getSide();
    }

    getLayout(context: RenderContext) {
        const metrics = this.getMetrics(context);
        return {
            output: this,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            width: metrics.width / PX_PER_METER,
            height: metrics.height / PX_PER_METER,
            ascent: metrics.ascent / PX_PER_METER,
            descent: metrics.descent / PX_PER_METER,
            places: [],
            // A leaf has nothing of its own to report: its z lives in the place its
            // parent gave it, and Infinity loses every Math.min on the way up.
            nearest: Infinity,
        };
    }

    getBackground(): Color | undefined {
        return undefined;
    }

    getLocalizedTextOrDoc(): TextValue | Markup {
        if (this.text instanceof TextValue) {
            return this.text;
        } else return this.text.markup;
    }

    getShortDescription() {
        const textOrDoc = this.getLocalizedTextOrDoc();
        return textOrDoc instanceof TextValue
            ? textOrDoc.text
            : (textOrDoc?.toText() ?? '');
    }

    getDescription(locales: Locales) {
        if (this._description === undefined) {
            const text = this.getShortDescription();

            // Check all animation states for sequence descriptions first
            let animationDescription = '';
            const animations = [
                this.entering,
                this.resting,
                this.moving,
                this.exiting,
            ];
            for (const animation of animations) {
                if (animation instanceof Sequence) {
                    const seqDescription = animation.getDescription(locales);
                    if (seqDescription && seqDescription.trim() !== '') {
                        animationDescription = seqDescription;
                        break;
                    }
                }
            }

            // If no sequence description found, use pose description
            if (!animationDescription) {
                animationDescription =
                    this.resting instanceof Pose
                        ? this.resting.getDescription(locales)
                        : this.pose.getDescription(locales);
            }

            const color = this.pose.color;
            const colorDescription = color
                ? describeColorLocalized(
                      locales,
                      color.lightness.toNumber(),
                      color.chroma.toNumber(),
                      color.hue.toNumber(),
                  )
                : undefined;
            this._description = locales
                .concretize((l) => l.output.Phrase.defaultDescription, {
                    text: text,
                    name:
                        this.name instanceof TextValue
                            ? this.name.text
                            : undefined,
                    size: this.size,
                    // The face's own words, not just its family name: a creator
                    // who can't see the stage has no other way to learn what
                    // "Creepster" looks like. Falls back to the bare name for a
                    // face we have no words for.
                    face: describeFaceWithName(locales, this.face),
                    animation: animationDescription,
                    color: colorDescription,
                    // A spoken bubble is left out: speech synthesis already
                    // voices it, and two describers of one line are heard as
                    // the same sentence twice, in two different voices. The
                    // same bail `OutputDescriptions.describable` makes for `Say`.
                    bubble:
                        this.bubble && this.bubble.say === undefined
                            ? this.bubble.getShortDescription()
                            : undefined,
                })
                .toText()
                .trim();
        }
        return this._description;
    }

    getBubbleSay() {
        return this.bubble?.say;
    }

    getEntryAnimated() {
        return this.entering !== undefined ? [this] : [];
    }

    isEmpty() {
        return false;
    }

    getRepresentativeText() {
        const preferred = this.getLocalizedTextOrDoc();
        return preferred instanceof Markup
            ? preferred.getRepresentativeText()
            : preferred.text;
    }

    gatherFaces(set: Set<SupportedFace>): Set<SupportedFace> {
        if (this.face) set.add(this.face);
        return set;
    }

    toString() {
        return this.text instanceof TextValue
            ? this.text.text
            : this.text.markup.toText();
    }
}

export function toFont(value: Value | undefined): string | undefined {
    return value instanceof TextValue ? value.text : undefined;
}

export function toPhrase(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): Phrase | undefined {
    if (!(value instanceof StructureValue)) return undefined;

    const texts = toTextLang(getOutputInput(value, 0));

    const {
        size,
        face: font,
        place,
        name,
        description,
        selectable,
        background,
        pose,
        resting: rest,
        entering: enter,
        moving: move,
        exiting: exit,
        changing,
        duration,
        style,
    } = getTypeStyle(project, value, 1, true);

    const AfterStyleOffset = 22;

    const wrap = toNumber(getOutputInput(value, AfterStyleOffset));
    const alignment = toText(getOutputInput(value, AfterStyleOffset + 1));
    const direction = toText(getOutputInput(value, AfterStyleOffset + 2));
    const matter = toMatter(getOutputInput(value, AfterStyleOffset + 3));
    const shadow = toAura(project, getOutputInput(value, AfterStyleOffset + 4));
    const bubble = toBubble(
        project,
        getOutputInput(value, AfterStyleOffset + 5),
        namer,
    );

    return texts !== undefined &&
        (!Array.isArray(texts) || texts.length > 0) &&
        duration !== undefined &&
        style !== undefined &&
        pose &&
        selectable !== undefined
        ? new Phrase(
              value,
              texts,
              size,
              font,
              place,
              namer.getName(name?.text, value),
              description,
              selectable,
              background,
              pose,
              enter,
              rest,
              move,
              exit,
              duration,
              style,
              changing,
              wrap,
              alignment?.text,
              // ø (None) → undefined, meaning "inherit the context's layout".
              direction ? (direction.text as WritingLayoutSymbol) : undefined,
              matter,
              shadow,
              bubble,
          )
        : undefined;
}

export function toText(value: Value | undefined) {
    return value instanceof TextValue ? value : undefined;
}

export function toTextLang(value: Value | undefined) {
    return value instanceof TextValue || value instanceof MarkupValue
        ? value
        : undefined;
}

export type FormattedText = {
    text: string;
    italic: boolean;
    weight: undefined | FontWeight;
};
