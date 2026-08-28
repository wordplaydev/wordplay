/**
 * How big a speech bubble is, in metres.
 *
 * The bubble is laid out by the browser from CSS, so this is a *prediction*
 * rather than a definition — unlike a phrase, whose box the model dictates and
 * `PhraseView` then paints. Every constant below is read off the `.bubble` rules
 * in PhraseView.svelte and has to be kept in step with them.
 *
 * It is accurate to a few percent, which is fine for framing the camera (the fit
 * already pads to three quarters of the viewport) and for scoring which side to
 * sit on. It is **not** accurate enough for snapping or hit-testing, and must
 * not be used for either.
 */

import type Bubble from '@output/Bubble/Bubble';
import type { SupportedFace } from '@basis/faces/Fonts';
import TextValue from '@values/TextValue';
import measureFormats from '@output/Output/measureFormats';
import { PX_PER_METER } from '@output/Output/outputToCSS';
import { splitCharacterRefs } from '@output/Output/splitCharacterRefs';
import type { FormattedText } from '@output/Output/Phrase';

/** `padding: 0.3em 0.5em` plus `border: 0.06em`, under `box-sizing: border-box`. */
const HorizontalChrome = 2 * 0.5 + 2 * 0.06;
const VerticalChrome = 2 * 0.3 + 2 * 0.06;
/** `line-height: 1.25`. */
const LineHeight = 1.25;
/** `max-inline-size: 12em`, which applies only when `wrap` is ø. */
const FallbackWrap = 12;
/** `--tail`, the gap between the speaker and the bubble. */
const SpeechTail = 0.3;
const ThoughtTail = 0.8;

export type BubbleBox = {
    width: number;
    height: number;
    /** The gap between the speaker's edge and the bubble. */
    tail: number;
};

/**
 * The bubble's outer box at a given font size, in metres.
 *
 * `size` is the *stage's* text size unless the bubble names its own — never the
 * speaker's, which is why this takes it rather than reading a render context.
 */
export default function measureBubble(
    bubble: Bubble,
    face: SupportedFace,
    size: number,
    locale: string,
): BubbleBox {
    const text = bubble.getLocalizedTextOrDoc();
    const formats: FormattedText[] =
        text instanceof TextValue
            ? splitCharacterRefs(text.text).map((chunk) => ({
                  text: chunk.kind === 'character' ? chunk.ref : chunk.text,
                  italic: false,
                  weight: undefined,
              }))
            : text.getFormats();

    // Two different units, and both branches are live: `wrap` is absolute metres,
    // while the CSS fallback scales with the font size. A `Bubble(…)` defaults
    // `wrap` to 10m, but the `bubble: 'hi'` shorthand leaves it unset.
    const maxInline = bubble.wrap ?? FallbackWrap * size;
    // The constraint is on the border box, so this much less is left to wrap in.
    const contentMax = Math.max(0, maxInline - HorizontalChrome * size);

    const measured = measureFormats(formats, {
        face,
        size,
        maxWidth: contentMax * PX_PER_METER,
        // The bubble is always horizontal, whatever the speaker is.
        layout: 'horizontal-tb',
        locale,
        exact: true,
    });

    // Shrink to fit, then clamp: `width: max-content` with a `max-inline-size`.
    const content = Math.min(measured.longestLine / PX_PER_METER, contentMax);

    return {
        width: content + HorizontalChrome * size,
        height: measured.lines * LineHeight * size + VerticalChrome * size,
        tail: (bubble.isThought() ? ThoughtTail : SpeechTail) * size,
    };
}
