import type LanguageCode from '@locale/LanguageCode';
import Markup from '@nodes/Markup';
import TextValue from '@values/TextValue';
import { getRandomTransition } from '@output/animation/getRandomTransition';
import { getRewriteTransition } from '@output/animation/getRewriteTransition';
import { getTextTransition, graphemes } from '@output/animation/getTextTransition';
import {
    getMarkupRandomTransition,
    getMarkupRewriteTransition,
    getMarkupTransition,
    markupGraphemes,
} from '@output/animation/markupTransition';
import type { TextEffect } from '@output/animation/OutputAnimation';
import { getRandomPool } from '@output/animation/textEffectPool';

/**
 * The renderable form of a phrase's text: a plain string for plain text, or a
 * single-line Markup for formatted text (matching how the markup is rendered
 * at rest). Text transitions morph between these.
 */
export function reprOf(value: TextValue | Markup): string | Markup {
    return value instanceof TextValue ? value.text : value.asLine();
}

/** The plain-text key used to detect a real text change (ignoring formatting). */
export function keyOf(repr: string | Markup): string {
    return typeof repr === 'string' ? repr : repr.toText();
}

/** Whether two reprs are the same kind (both plain or both markup). */
export function sameKind(a: string | Markup, b: string | Markup): boolean {
    return (typeof a === 'string') === (typeof b === 'string');
}

export type TransitionContext = {
    /** How many steps a random transition has (one distinct cycling frame per step). */
    stepCount: number;
    /** The language whose characters the random effect cycles: the text's own
     *  tag, or the program's primary locale. */
    language: LanguageCode | undefined;
    /** The region of the language, for region-specific character sets (e.g.
     *  Chinese in TW). */
    region: string | undefined;
};

/**
 * Build the step sequence that morphs `from` into `target` with the given
 * effect. `edit` backspaces to the shared prefix and types forward; `rewrite`
 * types over positions in random order; `random` slot-machine cycles the
 * language's (or script's) characters. Formatted steps wear the target's
 * formatting at each position. Async because the random effect's character
 * pool derives from lazily fetched Unicode and CLDR exemplar data; the other
 * effects resolve immediately.
 */
export async function getTransitionSteps(
    effect: TextEffect,
    from: string | Markup,
    target: string | Markup,
    { stepCount, language, region }: TransitionContext,
): Promise<(string | Markup)[]> {
    if (typeof target === 'string') {
        const fromString = typeof from === 'string' ? from : '';
        if (effect === 'edit') return getTextTransition(fromString, target);
        if (effect === 'rewrite')
            return getRewriteTransition(fromString, target);
        const pool = await getRandomPool(fromString, target, language, region);
        return getRandomTransition(
            fromString,
            target,
            // No pool (e.g. all-emoji text)? Cycle the texts' own characters.
            pool ?? graphemes(fromString + target),
            stepCount,
        );
    }

    const fromMarkup = from instanceof Markup ? from : target;
    if (effect === 'edit') return getMarkupTransition(fromMarkup, target);
    if (effect === 'rewrite')
        return getMarkupRewriteTransition(fromMarkup, target);
    const pool = await getRandomPool(
        fromMarkup.toText(),
        target.toText(),
        language,
        region,
    );
    return getMarkupRandomTransition(
        fromMarkup,
        target,
        pool ?? markupGraphemes(fromMarkup).concat(markupGraphemes(target)),
        stepCount,
    );
}
