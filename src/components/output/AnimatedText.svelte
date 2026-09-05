<!-- Text that morphs when it changes, driven by an output's `changing` text
     effect (issue #74). Extracted from PhraseView so a `Phrase` and the speech
     bubble it carries animate their words the same way, from the one setting
     the creator wrote — see Bubble.ts.

     Renders no wrapper element: a phrase's box is sized to exact text metrics,
     so anything around the text would change what the layout measured. -->
<script lang="ts">
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import PlainTextView from '@components/output/PlainTextView.svelte';
    import { locales } from '@db/Database';
    import type LanguageCode from '@locale/LanguageCode';
    import type { RegionCode } from '@locale/Regions';
    import type Markup from '@nodes/Markup';
    import { getTransitionIndex } from '@output/animation/getTextTransition';
    import {
        getTransitionSteps,
        keyOf,
        reprOf,
        sameKind,
    } from '@output/animation/getTransitionSteps';
    import {
        changingToTextEffect,
        styleToEasingFunction,
    } from '@output/animation/OutputAnimation';
    import type TextValue from '@values/TextValue';
    import { untrack } from 'svelte';

    interface Props {
        /** The committed text to show. */
        text: TextValue | Markup;
        /** The localized name of the effect to play when the text changes, or undefined for an instant change. */
        changing: string | undefined;
        /** How long an effect runs, in seconds. */
        duration: number;
        /** The localized name of the easing style pacing the effect. */
        style: string;
        /** The viewer's animation factor; 0 means no motion, so changes are instant. */
        animationFactor: number;
        /** The language whose characters the random effect cycles. */
        language: LanguageCode;
        /** The region that language is written in, when known. */
        region: RegionCode | undefined;
        /** Whether the stage is adapting output to a dark canvas. */
        adapting: boolean;
    }

    let {
        text,
        changing,
        duration,
        style,
        animationFactor,
        language,
        region,
        adapting,
    }: Props = $props();

    // What's currently shown. While text is morphing this holds an intermediate
    // step (a truncated string or Markup); otherwise it equals reprOf(text).
    // Driven reactively so Svelte owns the DOM (the old engine mutated innerHTML,
    // which broke Svelte).
    let displayed = $state<string | Markup>(untrack(() => reprOf(text)));
    // The last text value we committed to (null on first render).
    let prev: TextValue | Markup | null = untrack(() => text);
    // The in-flight requestAnimationFrame handle, if a transition is animating.
    let rafHandle: number | undefined;
    // Bumped on every text change and on destroy, so an async transition setup
    // (the random effect's pool load) discards itself when superseded.
    let transitionToken = 0;

    /** Cancel any transition animation in flight and invalidate any pending
     *  async step building. */
    function cancelTransition() {
        transitionToken++;
        if (rafHandle !== undefined) {
            cancelAnimationFrame(rafHandle);
            rafHandle = undefined;
        }
    }

    /** Play a precomputed step sequence over `totalMs`, eased by the output's
     *  style, landing exactly on `target`. */
    function animateTransition(
        steps: (string | Markup)[],
        target: string | Markup,
        totalMs: number,
    ) {
        const easing = styleToEasingFunction($locales, style);
        const start = performance.now();
        const step = (now: number) => {
            const progress = Math.min(1, (now - start) / totalMs);
            const index = getTransitionIndex(steps.length, easing(progress));
            displayed = index < 0 ? target : steps[index];
            if (progress < 1) rafHandle = requestAnimationFrame(step);
            else {
                displayed = target;
                rafHandle = undefined;
            }
        };
        rafHandle = requestAnimationFrame(step);
    }

    // Animate the displayed text when it changes between evaluations and
    // `changing` names a text effect; without one, changes are instant. Step
    // building lives in getTransitionSteps; here we just gate, build, and play
    // the steps over the duration, eased by the style. Reactive `displayed`
    // state keeps Svelte in control of the DOM.
    $effect(() => {
        // Re-run whenever the text changes.
        const current = text;

        untrack(() => {
            cancelTransition();

            const target = reprOf(current);
            const committed = prev === null ? null : reprOf(prev);
            prev = current;

            const effect = changingToTextEffect($locales, changing);
            // Only animate a real same-kind text change, and only when the
            // output names a text effect with `changing`. Cross-kind
            // (plain↔markup) and formatting-only changes swap instantly.
            // Editing needs no guard: the caller unmounts this while its field
            // is open, so a fresh mount commits the new text with no morph.
            if (
                committed === null ||
                !sameKind(committed, target) ||
                keyOf(committed) === keyOf(target) ||
                animationFactor <= 0 ||
                duration <= 0 ||
                effect === undefined
            ) {
                displayed = target;
                return;
            }

            // Where to morph from: continue from what's on screen if it's the same
            // kind (a transition was mid-flight), otherwise from the last committed text.
            const from = sameKind(displayed, target) ? displayed : committed;
            const totalMs = duration * animationFactor * 1000;

            // Build the steps (async only for the random effect's lazily
            // fetched character data); the token discards the result if a
            // newer change or destroy supersedes it. Random cycles roughly
            // every 50ms regardless of duration.
            const token = transitionToken;
            getTransitionSteps(effect, from, target, {
                stepCount: Math.max(8, Math.min(60, Math.round(totalMs / 50))),
                language,
                region,
            }).then((steps) => {
                if (token !== transitionToken) return;
                animateTransition(steps, target, totalMs);
            });
        });

        // Cancel any in-flight transition on destroy.
        return cancelTransition;
    });
</script>

{#if typeof displayed === 'string'}<PlainTextView
        text={displayed}
        {adapting}
    />{:else}<MarkupHTMLView markup={displayed} inline />{/if}
