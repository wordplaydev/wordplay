<script lang="ts">
    import { browser } from '$app/environment';
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { getAnnouncer } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { placeNearTarget } from '@components/widgets/placeNearTarget';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import { CANCEL_SYMBOL, QUESTION_SYMBOL } from '@parser/Symbols';
    import type { UIExplanation } from '@components/project/tourSteps';
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

    /** True when the target is tucked inside a closed overflow menu, and the
     * rect is the menu's toggle rather than the control itself. */
    let overflowed = $state(false);

    let panelWidth = $state(0);
    let panelHeight = $state(0);

    let position = $state<{ left: number; top: number }>({ left: 0, top: 0 });

    /** True once we've measured the panel and computed a position. After the
     * first measurement we keep this true so the panel transitions smoothly
     * between step positions instead of flashing at (0,0). */
    let positioned = $state(false);

    /** The element that had focus when the tour opened, for restoring on close. */
    let returnFocusTo: HTMLElement | null = null;

    /** Whether an element is actually rendered and visible — a nonzero rect is
     * not enough, since an element in a closed overflow popup keeps its layout
     * under `visibility: hidden` and measures at (0, 0). */
    function isShown(el: HTMLElement): boolean {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (typeof el.checkVisibility === 'function')
            return el.checkVisibility({
                checkOpacity: false,
                checkVisibilityCSS: true,
            });
        // Fallback without checkVisibility: treat a closed overflow popup as hidden.
        return el.closest('.overflow-panel.closed') === null;
    }

    /** Find the target element matching the current uiid and capture its rect.
     * Prefer a visible match; when the only match is tucked inside a closed
     * overflow menu, highlight the menu's toggle instead so the tour points at
     * the place the control can be found. */
    function locate() {
        if (!browser || !current) return;
        overflowed = false;
        const candidates = Array.from(
            document.querySelectorAll(
                `[data-uiid="${CSS.escape(current.uiid)}"]`,
            ),
        ).filter((el): el is HTMLElement => el instanceof HTMLElement);

        const visible = candidates.find(isShown);
        if (visible) {
            rect = visible.getBoundingClientRect();
            return;
        }

        // Hidden inside an overflow popup? Point at the toggle that opens it.
        for (const el of candidates) {
            const panel = el.closest('.overflow-panel');
            if (panel !== null && panel.id.length > 0) {
                const toggle = document.querySelector(
                    `[data-controls="${CSS.escape(panel.id)}"]`,
                );
                if (toggle instanceof HTMLElement && isShown(toggle)) {
                    rect = toggle.getBoundingClientRect();
                    overflowed = true;
                    return;
                }
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

    /** Announce step changes through the centralized Announcer (rather than
     *  local aria-live regions — see CLAUDE.md): progress plus the new step's
     *  explanation. The first step isn't announced, matching live-region
     *  semantics for initial content. */
    const announce = getAnnouncer();
    let lastAnnouncedStep: number | null = null;
    $effect(() => {
        const text = `${step + 1}/${explanations.length}: ${$locales
            .getUnannotatedTexts(current.explanation)
            .join('\n')}`;
        if (lastAnnouncedStep === null) {
            lastAnnouncedStep = step;
            return;
        }
        if (step === lastAnnouncedStep) return;
        lastAnnouncedStep = step;
        if (announce && $announce)
            $announce('tour-step', $locales.getLanguages()[0], text);
    });

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
    /** Whether focus has been moved into the tour yet. */
    let focused = false;
    $effect(() => {
        // Wait for `positioned`: until the panel has been measured it's
        // `visibility: hidden`, which takes its whole subtree out of the
        // accessibility tree — focusing then leaves a screen reader on an
        // empty container with nothing to read.
        if (dialog === undefined || !positioned || focused) return;
        focused = true;
        if (returnFocusTo === null) {
            const active = document.activeElement;
            // A pointer press on the launcher leaves focus on the body (see
            // Button's onpointerdown), which is no place to return to.
            returnFocusTo =
                active instanceof HTMLElement && active !== document.body
                    ? active
                    : null;
        }
        tick().then(() => {
            // Focus the first control rather than the container: screen
            // readers reliably announce a button and its label, and the tour
            // is operated with its Next/Previous/Close buttons.
            const target = nextView ?? prevView ?? dialog;
            if (target)
                setKeyboardFocus(target, 'Focusing tour when it opens.');
        });
    });

    onDestroy(() => {
        // Restore focus to whatever was focused before the tour opened.
        if (returnFocusTo && returnFocusTo.isConnected)
            setKeyboardFocus(returnFocusTo, 'Restoring focus after tour.');
    });
</script>

<svelte:window onresize={locate} onscroll={locate} />

<!-- Not aria-modal: a tour explains the page around it, so the rest of the app
     has to stay perceivable to a screen reader. Tab is still trapped so
     keyboard operation stays inside the tour. -->
<div
    class="tour"
    role="dialog"
    aria-modal="false"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.tour.label)}
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
            <Button tip={(l) => l.ui.tour.close} action={close} background
                >{CANCEL_SYMBOL}</Button
            >
        </header>
        <div class="content">
            {#if rect === null}
                <p class="offscreen">
                    <LocalizedText path={(l) => l.ui.tour.offscreen} />
                </p>
            {:else if overflowed}
                <p class="offscreen">
                    <LocalizedText path={(l) => l.ui.tour.overflowed} />
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
                background
                bind:view={prevView}
                action={previous}>←</Button
            >
            <span class="progress">{step + 1}/{explanations.length}</span>
            <Button
                tip={(l) => l.ui.tour.next}
                active={step < explanations.length - 1}
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
