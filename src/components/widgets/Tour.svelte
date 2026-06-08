<script module lang="ts">
    import type { LocaleTextsAccessor } from '@locale/Locales';

    /** A pair identifying a UI element by its `data-uiid` and the localized
     * markup that explains it. A Tour walks through a sequence of these. */
    export type UIExplanation = {
        uiid: string;
        explanation: LocaleTextsAccessor;
        /** Optional side-effect run when this step becomes active. Use to
         * change UI state so the next highlighted control is visible —
         * e.g., switching a tab in the Guide so the relevant section is
         * showing before its target is located. */
        onEnter?: () => void;
    };
</script>

<script lang="ts">
    import { browser } from '$app/environment';
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { placeNearTarget } from '@components/widgets/placeNearTarget';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CANCEL_SYMBOL, QUESTION_SYMBOL } from '@parser/Symbols';
    import { onDestroy, tick, untrack } from 'svelte';

    interface Props {
        /** The ordered sequence of explanations to walk through. */
        explanations: UIExplanation[];
        /** Locale path for the subheader naming this particular tour. */
        subheader: LocaleTextAccessor;
        /** Called when the tour should be dismissed. */
        close: () => void;
    }

    let { explanations, subheader, close }: Props = $props();

    let step = $state(0);
    let current = $derived(explanations[step]);

    /** The bounding rect of the current target, or null if not on screen. */
    let rect = $state<DOMRect | null>(null);

    let panelWidth = $state(0);
    let panelHeight = $state(0);

    let position = $state<{ left: number; top: number }>({ left: 0, top: 0 });

    /** True once we've measured the panel and computed a position. After the
     * first measurement we keep this true so the panel transitions smoothly
     * between step positions instead of flashing at (0,0). */
    let positioned = $state(false);

    /** The element that had focus when the tour opened, for restoring on close. */
    let returnFocusTo: HTMLElement | null = null;

    /** Find the target element matching the current uiid and capture its rect. */
    function locate() {
        if (!browser || !current) return;
        const el = document.querySelector(
            `[data-uiid="${CSS.escape(current.uiid)}"]`,
        ) as HTMLElement | null;
        if (el) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
                rect = r;
                return;
            }
        }
        rect = null;
    }

    /** Compute the explanation panel's position. */
    function reposition() {
        if (!browser) return;
        if (panelWidth === 0 || panelHeight === 0) return;
        const margin = 12;
        const container = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
        if (rect === null) {
            // No target — center in the viewport.
            position = {
                left: Math.max(margin, (container.width - panelWidth) / 2),
                top: Math.max(margin, (container.height - panelHeight) / 2),
            };
            positioned = true;
            return;
        }
        position = placeNearTarget(
            {
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
            },
            { width: panelWidth, height: panelHeight },
            container,
            margin,
        );
        positioned = true;
    }

    // Re-locate the target whenever the current step changes. We don't reset
    // `positioned` here — keeping the panel visible across step changes lets
    // its position transition smoothly to the new spot.
    $effect(() => {
        step;
        untrack(() => {
            // Fire the step's onEnter side-effect (e.g. switching a tab)
            // before measuring, so the target has a chance to render.
            current?.onEnter?.();
            tick().then(locate);
        });
    });

    // Reposition whenever the rect or panel size changes.
    $effect(() => {
        rect;
        panelWidth;
        panelHeight;
        untrack(() => reposition());
    });

    /** Buttons we may want to focus after a navigation action. */
    let prevView = $state<HTMLButtonElement | undefined>(undefined);
    let nextView = $state<HTMLButtonElement | undefined>(undefined);

    function next() {
        // On the last step do nothing — closing is reserved for the explicit
        // close button and Esc, so the user doesn't dismiss the tour by
        // overshooting with the Right arrow or the Next button.
        if (step >= explanations.length - 1) return;
        step += 1;
        nextView?.focus();
    }

    function previous() {
        if (step <= 0) return;
        step -= 1;
        prevView?.focus();
    }

    /** Wrap Tab focus so it stays within the dialog (WCAG 2.1.2). */
    function trapFocus(event: KeyboardEvent) {
        if (!dialog) return;
        const focusables = Array.from(
            dialog.querySelectorAll<HTMLElement>('button'),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === dialog)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            previous();
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            next();
        } else if (event.key === 'Tab') trapFocus(event);
    }

    let dialog = $state<HTMLElement | undefined>(undefined);
    $effect(() => {
        if (dialog && returnFocusTo === null) {
            returnFocusTo = (document.activeElement as HTMLElement) ?? null;
            dialog.focus();
        }
    });

    onDestroy(() => {
        // Restore focus to whatever was focused before the tour opened.
        returnFocusTo?.focus?.();
    });
</script>

<svelte:window onresize={locate} onscroll={locate} />

<div
    class="tour"
    role="dialog"
    aria-modal="true"
    aria-label={$locales.getPlainText((l) => l.ui.tour.label)}
    onkeydown={onKey}
    tabindex={-1}
    bind:this={dialog}
>
    {#if rect !== null}
        <!-- The cutout div sits where the target is and uses a huge spread
             box-shadow to dim the rest of the viewport, leaving a hole that
             reveals the highlighted control. Animating left/top/width/height
             lets the cutout slide between step targets. -->
        <div
            class="cutout"
            style:left="{rect.left - 6}px"
            style:top="{rect.top - 6}px"
            style:width="{rect.width + 12}px"
            style:height="{rect.height + 12}px"
            aria-hidden="true"
        ></div>
    {:else}
        <div class="backdrop" aria-hidden="true"></div>
    {/if}

    <div
        class="panel"
        class:hidden={!positioned}
        style:left="{position.left}px"
        style:top="{position.top}px"
        bind:clientWidth={panelWidth}
        bind:clientHeight={panelHeight}
    >
        <header class="header">
            <Subheader compact
                ><Emoji text={QUESTION_SYMBOL} />
                <LocalizedText path={subheader} /></Subheader
            >
            <Button
                tip={(l) => l.ui.tour.close}
                padding={true}
                action={close}
                background>{CANCEL_SYMBOL}</Button
            >
        </header>
        <div class="content" aria-live="polite">
            {#if rect === null}
                <p class="offscreen">
                    {$locales.getPlainText((l) => l.ui.tour.offscreen)}
                </p>
            {/if}
            <div class="explanation">
                <MarkupHTMLView markup={current.explanation} />
            </div>
        </div>
        <div class="nav">
            <Button
                tip={(l) => l.ui.tour.previous}
                active={step > 0}
                padding={true}
                background
                bind:view={prevView}
                action={previous}>←</Button
            >
            <span class="progress" aria-live="polite"
                >{step + 1}/{explanations.length}</span
            >
            <Button
                tip={(l) => l.ui.tour.next}
                active={step < explanations.length - 1}
                padding={true}
                background
                bind:view={nextView}
                action={next}>→</Button
            >
        </div>
    </div>
</div>

<style>
    .tour {
        position: fixed;
        inset: 0;
        z-index: 50;
    }

    .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        pointer-events: none;
    }

    /* The cutout is a transparent box positioned over the target. Its huge
       outward box-shadow fills the rest of the viewport with the dim color,
       and the hover-colored outline draws a crisp boundary so the highlight
       reads even on controls without their own borders. */
    .cutout {
        position: fixed;
        background: transparent;
        border-radius: 8px;
        outline: 2px solid var(--wordplay-hover);
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.85);
        pointer-events: none;
        transition:
            left calc(var(--animation-factor) * 200ms) ease,
            top calc(var(--animation-factor) * 200ms) ease,
            width calc(var(--animation-factor) * 200ms) ease,
            height calc(var(--animation-factor) * 200ms) ease;
    }

    .panel {
        position: absolute;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        max-width: min(20em, calc(100vw - 2 * var(--wordplay-spacing)));
        box-shadow: 2px 2px 5px var(--wordplay-chrome);
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        transition:
            left calc(var(--animation-factor) * 200ms) ease,
            top calc(var(--animation-factor) * 200ms) ease;
    }

    /* Hide until the first measurement so the panel doesn't flash at (0,0). */
    .panel.hidden {
        visibility: hidden;
    }

    .header {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--wordplay-spacing);
    }

    .offscreen {
        font-style: italic;
        margin: 0;
        opacity: 0.85;
    }

    .nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: var(--wordplay-spacing);
    }

    .progress {
        font-variant-numeric: tabular-nums;
    }
</style>
