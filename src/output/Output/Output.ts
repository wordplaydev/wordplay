import { getBind } from '@locale/getBind';
import { TYPE_SYMBOL } from '@parser/Symbols';
import type Value from '@values/Value';
import { type SupportedFace } from '@basis/faces/Fonts';
import toStructure from '@basis/toStructure';
import type Locales from '@locale/Locales';
import type Color from '@output/Color/Color';
import type Place from '@output/Place/Place';
import type Pose from '@output/animation/Pose';
import type { DefinitePose } from '@output/animation/Pose';
import type RenderContext from '@output/RenderContext';
import type Say from '@output/Output/Say';
import type { BubbleBox } from '@output/Bubble/bubbleLayout';
import type { BubbleSide } from '@output/Bubble/Bubble';
import type { Rect } from '@output/Bubble/bubbleSides';
import Sequence from '@output/animation/Sequence';
import TextValue from '@values/TextValue';
import Valued from '@output/Output/Valued';

export function createOutputType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Output, TYPE_SYMBOL)}()
`);
}

export const DefaultStyle = 'zippy';

/** Every group has the same style information. */
export default abstract class Output extends Valued {
    readonly size: number | undefined;
    readonly face: SupportedFace | undefined;
    readonly place: Place | undefined;
    readonly name: TextValue | string;
    readonly description: TextValue | undefined;
    readonly selectable: boolean;
    readonly background: Color | undefined;
    readonly pose: DefinitePose;
    readonly entering: Pose | Sequence | undefined;
    readonly resting: Pose | Sequence | undefined;
    readonly moving: Pose | Sequence | undefined;
    readonly exiting: Pose | Sequence | undefined;
    readonly duration: number;
    readonly style: string;

    constructor(
        value: Value,
        size: number | undefined = undefined,
        font: SupportedFace | undefined = undefined,
        place: Place | undefined = undefined,
        name: TextValue | string,
        description: TextValue | undefined = undefined,
        selectable: boolean,
        background: Color | undefined,
        pose: DefinitePose,
        entry: Pose | Sequence | undefined = undefined,
        resting: Pose | Sequence | undefined = undefined,
        moving: Pose | Sequence | undefined = undefined,
        exiting: Pose | Sequence | undefined = undefined,
        duration: number,
        style: string,
    ) {
        super(value);

        this.size = size ? Math.max(0, size) : size;
        this.face = font;
        this.place = place;
        this.name = name;
        this.description = description;
        this.selectable = selectable;
        this.background = background;
        this.pose = pose;
        this.entering = entry;
        this.resting = resting;
        this.moving = moving;
        this.exiting = exiting;
        this.duration = duration;
        this.style = style;
    }

    abstract getLayout(context: RenderContext): {
        output: Output;
        left: number;
        right: number;
        top: number;
        bottom: number;
        width: number;
        height: number;
        ascent: number;
        descent: number;
        places: [Output, Place][];
        /** The nearest z of anything in this subtree, in stage coordinates — z is absolute
         *  (`Place.offset` deliberately leaves it alone), so it needs no accumulation. A
         *  leaf reports Infinity: its own z is reported by whichever parent placed it.
         *  The camera's zoom-in bound follows this; see `nearestZ` in fit.ts. */
        nearest: number;
        /**
         * Extra visual extent beyond this output's box, in its own frame — what
         * speech bubbles spill. Optional, so nothing that has none has to say so.
         *
         * Kept apart from `width`/`height` because it must not resize anything:
         * an arrangement makes no room for a bubble, and nothing on stage moves
         * when someone starts talking. Only the box the camera frames grows.
         */
        overflow?: Rect | undefined;
        /** The side each child's bubble was given, for whoever renders them. */
        sides?: Map<Output, BubbleSide> | undefined;
    };

    abstract getOutput(): (Output | null)[];
    abstract getBackground(): Color | undefined;
    abstract getShortDescription(locales: Locales): string;
    abstract getDescription(locales: Locales): string;

    abstract getEntryAnimated(): Output[];

    /* 
    Given a predict function that takes a type input, recursively scans
    outputs for a match.
    */
    abstract find(check: (output: Output) => boolean): Output | undefined;

    abstract gatherFaces(set: Set<SupportedFace>): Set<SupportedFace>;

    getRestOrDefaultPose(): Pose | Sequence {
        return this.resting ?? this.pose;
    }

    getFirstRestPose(): Pose {
        return this.resting instanceof Sequence
            ? (this.resting.getFirstPose() ?? this.pose)
            : (this.resting ?? this.pose);
    }

    getDefaultPose(): DefinitePose {
        return this.pose;
    }

    getRenderContext(context: RenderContext) {
        return context.withFontAndSize(this.face, this.size);
    }

    abstract getRepresentativeText(locales: Locales): string | undefined;

    getHTMLID(): string {
        return `output-${this.getName()}`;
    }

    abstract isEmpty(): boolean;

    /** False for outputs that are heard, not seen: they contribute no size to an
     *  arrangement, so they must not earn padding beside their siblings. */
    /**
     * The `Say` this output's own decoration carries, if any — only a `Phrase`'s
     * bubble has one. Declared here so `Group`/`Stage` can gather them without
     * knowing about `Phrase`, which would be an import cycle.
     */
    getBubbleSay(): Say | undefined {
        return undefined;
    }

    /**
     * How big this output's speech bubble is, or undefined without one. Only a
     * `Phrase` has one; declared here so a container can gather its children's
     * without knowing what they are.
     */
    getBubbleBox(_context: RenderContext): BubbleBox | undefined {
        return undefined;
    }

    /** The side the creator pinned for this output's bubble, if they pinned one. */
    getPinnedBubbleSide(): BubbleSide | undefined {
        return undefined;
    }

    /**
     * How far this output's text baseline sits above the bottom of its box, or
     * undefined for output that has no baseline — a shape, a group, a phrase in
     * vertical writing. A baseline only ever pairs with another baseline, so
     * anything undefined here is aligned some other way.
     */
    getBaselineOffset(_context: RenderContext): number | undefined {
        return undefined;
    }

    occupiesSpace(): boolean {
        return true;
    }

    /**
     * By default, a group's name for the purpose of animations is the ID of the node that created it.
     * */
    getName(): string {
        return this.name instanceof TextValue ? this.name.text : this.name;
    }

    isAnimated() {
        return (
            this.entering !== undefined ||
            this.resting instanceof Sequence ||
            this.moving !== undefined ||
            this.exiting !== undefined ||
            this.duration > 0 ||
            this.hasPoseMusic()
        );
    }

    /**
     * Whether any of this output's animation states carries music.
     *
     * `isAnimated` decides whether an output gets an `OutputAnimation` at all, and
     * a pose's music is struck from there — so without this a `duration: 0s`
     * output with a `resting:` pose that sounds would be silently silent. Tests
     * the raw value rather than a converted `Music`, since `Music` value-imports
     * this module's own `Pose`.
     */
    hasPoseMusic(): boolean {
        return [this.entering, this.resting, this.moving, this.exiting].some(
            (source) =>
                source instanceof Sequence
                    ? source.poses.some((step) => step.pose.music !== undefined)
                    : source?.music !== undefined,
        );
    }
}
