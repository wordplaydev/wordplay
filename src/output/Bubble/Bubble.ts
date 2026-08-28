import toStructure from '@basis/toStructure';
import type Project from '@db/projects/Project';
import { getBind } from '@locale/getBind';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';
import { TYPE_SYMBOL } from '@parser/Symbols';
import MarkupValue from '@values/MarkupValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Color from '@output/Color/Color';
import { toColor } from '@output/Color/Color';
import type Say from '@output/Output/Say';
import { toSay } from '@output/Output/Say';
import type { NameGenerator } from '@output/Output/Stage';
import { toNumber } from '@output/Output/Stage';
import Valued, { getOutputInputs } from '@output/Output/Valued';

/** The sides a bubble can sit on, as arrows, matching how `Phrase.direction` names layouts. */
export const BubbleSides = ['↑', '↓', '←', '→'] as const;
export type BubbleSide = (typeof BubbleSides)[number];

/** CSS-safe names for the sides, since a class name can't be an arrow. */
export const BubbleSideNames: Record<BubbleSide, string> = {
    '↑': 'up',
    '↓': 'down',
    '←': 'left',
    '→': 'right',
};

export const SpeechKind = '💬';
export const ThoughtKind = '💭';

/**
 * Where a bubble goes when nothing has chosen for it. Not the *default* side —
 * an unset side means "pick one" (see `getSide`) — but the one to fall back to
 * when there is no container to pick, as for output on its way off stage.
 */
export const FallbackSide: BubbleSide = '↑';
export const DefaultKind = SpeechKind;
export const DefaultWrap = 10;

export function createBubbleType(locales: Locales) {
    return toStructure(`
    ${getBind(locales, (locale) => locale.output.Bubble, TYPE_SYMBOL)}(
        ${getBind(locales, (locale) => locale.output.Bubble.text)}•""|\`…\`|🔊
        ${getBind(
            locales,
            (locale) => locale.output.Bubble.side,
        )}•${BubbleSides.map((side) => `'${side}'`).join('|')}|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Bubble.kind,
        )}•'${SpeechKind}'|'${ThoughtKind}': '${DefaultKind}'
        ${getBind(locales, (locale) => locale.output.Bubble.color)}•🌈|ø: ø
        ${getBind(locales, (locale) => locale.output.Bubble.background)}•🌈|ø: ø
        ${getBind(locales, (locale) => locale.output.Bubble.size)}•#m|ø: ø
        ${getBind(
            locales,
            (locale) => locale.output.Bubble.wrap,
        )}•#m|ø: ${DefaultWrap}m
    )
`);
}

export default class Bubble extends Valued {
    /** What the bubble shows. */
    readonly text: TextValue | MarkupValue;
    /** The `Say` the creator gave, when they gave one: what to speak. A spoken
     *  bubble is left out of its phrase's description, since speech synthesis
     *  voices it — the same rule that keeps a `Say` out of stage descriptions. */
    readonly say: Say | undefined;
    readonly side: BubbleSide | undefined;
    readonly kind: string | undefined;
    readonly color: Color | undefined;
    readonly background: Color | undefined;
    readonly size: number | undefined;
    readonly wrap: number | undefined;

    constructor(
        value: Value,
        text: TextValue | MarkupValue,
        say: Say | undefined,
        side?: BubbleSide,
        kind?: string,
        color?: Color,
        background?: Color,
        size?: number,
        wrap?: number,
    ) {
        super(value);
        this.text = text;
        this.say = say;
        this.side = side;
        this.kind = kind;
        this.color = color;
        this.background = background;
        this.size = size;
        this.wrap = wrap;
    }

    /** The side the creator pinned, or undefined to let the stage choose. */
    getSide(): BubbleSide | undefined {
        return this.side;
    }

    isThought(): boolean {
        return this.kind === ThoughtKind;
    }

    /** Matches `Phrase.getLocalizedTextOrDoc`, so the same renderer draws both. */
    getLocalizedTextOrDoc(): TextValue | Markup {
        return this.text instanceof TextValue ? this.text : this.text.markup;
    }

    getShortDescription(): string {
        return this.text instanceof TextValue
            ? this.text.text
            : this.text.markup.toText();
    }
}

/** The declared side a text value names, or undefined for anything else. */
function toSide(value: Value | undefined): BubbleSide | undefined {
    return value instanceof TextValue
        ? BubbleSides.find((side) => side === value.text)
        : undefined;
}

/** What a bubble shows and, optionally, speaks. */
type BubbleContent = { text: TextValue | MarkupValue; say: Say | undefined };

/**
 * The two shorthand arms a bubble's content can take: bare text or markup, which
 * is only shown, or a `Say`, which is shown *and* spoken. Shared by the `bubble`
 * input on `Phrase` and by `Bubble`'s own `text` input, so the two never diverge.
 */
function toBubbleContent(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): BubbleContent | undefined {
    if (value instanceof TextValue || value instanceof MarkupValue)
        return { text: value, say: undefined };
    // toSay doesn't check the structure's type, so check it here before asking.
    if (
        value instanceof StructureValue &&
        value.type === project.shares.output.Say
    ) {
        const say = toSay(project, value, namer);
        return say ? { text: say.text, say } : undefined;
    }
    return undefined;
}

export function toBubble(
    project: Project,
    value: Value | undefined,
    namer: NameGenerator,
): Bubble | undefined {
    if (value === undefined) return undefined;

    // `bubble: 'hi!'` and `bubble: Say('hi!')` are bubbles with everything else defaulted.
    const shorthand = toBubbleContent(project, value, namer);
    if (shorthand !== undefined)
        return new Bubble(value, shorthand.text, shorthand.say);

    if (!(
        value instanceof StructureValue &&
        value.type === project.shares.output.Bubble
    ))
        return undefined;

    const [textVal, side, kind, color, background, size, wrap] =
        getOutputInputs(value);

    const content = toBubbleContent(project, textVal, namer);
    if (content === undefined) return undefined;

    return new Bubble(
        value,
        content.text,
        content.say,
        toSide(side),
        kind instanceof TextValue ? kind.text : undefined,
        toColor(color),
        toColor(background),
        toNumber(size),
        toNumber(wrap),
    );
}
