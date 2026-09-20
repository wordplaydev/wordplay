<script lang="ts">
    /**
     * How far along something is.
     *
     * A component rather than a utility class, unlike `.visually-hidden`,
     * because the duplication here was not the four lines of CSS — it was the
     * ARIA contract under them. Four components each hand-wrote
     * `role="progressbar"` with its three `aria-value*` attributes, and one of
     * them (the start gate) had no accessible name at all, which is the defect
     * a retyped contract eventually produces.
     *
     * `label` is therefore required, and there is no way to render this without
     * one.
     *
     * Deliberately NOT used by the start gate, whose bar sits on an
     * error-colored card and draws its track and fill from that card's own
     * foreground so it reads against it, at a different height and with a
     * different indeterminate animation. That is a real difference, not drift —
     * so it keeps its bar and this keeps the three that were identical.
     */
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        /**
         * How far along, 0–100. `undefined` means the work is running but its
         * extent is unknown: the bar fills and a highlight sweeps across it,
         * because a percentage that stops updating reads as a hung page.
         */
        percent?: number | undefined;
        /** What is progressing. Announced, never shown — the sighted equivalent
         *  is the bar itself and whatever sentence sits beside it. */
        label: LocaleTextAccessor;
        /**
         * `spent` colors the fill with the error hue, for a meter that has
         * reached its limit. The sentence beside it says so too; this only
         * reinforces it, so nothing here depends on color alone.
         */
        tone?: 'normal' | 'spent';
        /**
         * Overlay a highlight that sweeps across the track.
         *
         * Independent of `percent`, because the two callers that use it are
         * determinate and still want it: it animates `transform`, which the
         * compositor runs, so it keeps moving while the main thread is busy
         * parsing or rebuilding — the moment a determinate percentage would
         * otherwise sit still and read as a hung page.
         */
        sweep?: boolean;
    }

    let {
        percent = undefined,
        label,
        tone = 'normal',
        sweep = false,
    }: Props = $props();

    /** Clamped, because a caller computing a ratio can overshoot on a rounding
     *  error and `aria-valuenow` outside its range is worse than a wrong bar. */
    const bounded = $derived(
        percent === undefined ? undefined : Math.max(0, Math.min(100, percent)),
    );
</script>

<div
    class="track"
    class:spent={tone === 'spent'}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={bounded ?? 0}
    aria-label={$locales.getPrimaryPlainText(label)}
>
    <div class="fill" style:width="{bounded ?? 100}%"></div>
    {#if sweep || bounded === undefined}<div class="sweep"></div>{/if}
</div>

<style>
    .track {
        position: relative;
        overflow: hidden;
        width: 100%;
        height: var(--wordplay-focus-width);
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
    }

    .fill {
        height: 100%;
        background: var(--wordplay-highlight-color);
    }

    .track.spent .fill {
        background: var(--wordplay-error);
    }

    /* Keeps moving on the compositor while the main thread is busy, so a
       working moment doesn't look like a hung one. */
    .sweep {
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        width: 30%;
        background: var(--wordplay-highlight-color);
        opacity: 0.5;
        animation: sweep calc(var(--animation-factor) * 1.2s) linear infinite;
    }

    @keyframes sweep {
        from {
            transform: translateX(-100%);
        }
        to {
            transform: translateX(400%);
        }
    }
</style>
