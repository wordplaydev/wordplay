<script lang="ts">
    /**
     * The shared shell for the editor's collapsible, resizable sidebars (the
     * Annotations and Wellspring panels, and any future ones). It owns the
     * boilerplate that used to be duplicated in each: the frame + resize knob,
     * the `<section>` with its width/collapse transition, the expand/collapse
     * Expander, the whole-bar toggle (click empty space), and the whole-bar
     * tooltip. Only the side, the persisted settings, and the content differ —
     * those come in as props and snippets.
     */
    import { getTip } from '@components/project/Contexts';
    import Expander from '@components/widgets/Expander.svelte';
    import ResizeHandle from '@components/widgets/ResizeHandle.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Which inline edge the sidebar sits on. `'start'` (inline-start, like
         *  the Wellspring) grows rightward; `'end'` (inline-end, like
         *  Annotations) grows leftward. */
        side: 'start' | 'end';
        /** Whether the sidebar is expanded — resolved by the parent (a setting,
         *  or an override). */
        expanded: boolean;
        /** Toggle the expanded state — resolved by the parent. */
        toggle: () => void;
        /** The committed width (from the parent's persisted setting). */
        width: number;
        min: number;
        max: number;
        /** Persist a new width (on drag end / keyboard nudge). */
        commit: (width: number) => void;
        /** The section's ARIA label. */
        label: LocaleTextAccessor;
        /** Label for the Expander and the whole-bar tooltip. */
        toggleLabel: LocaleTextAccessor;
        /** Optional data-uiid on the section (e.g. tutorial highlighting). */
        uiid?: string;
        /** Optional pointerup passthrough on the section (e.g. to clear a drag). */
        onpointerup?: (event: PointerEvent) => void;
        /** Optional content pinned above the scroll region when expanded (e.g. a
         *  search field). */
        header?: Snippet;
        /** Scrollable content shown when expanded. */
        expandedContent: Snippet;
        /** Scrollable content shown when collapsed (e.g. conflict dots). */
        collapsedContent?: Snippet;
        /** Content pinned to the block-end in both states (e.g. a recycle bin). */
        footer?: Snippet;
    }

    let {
        side,
        expanded,
        toggle,
        width,
        min,
        max,
        commit,
        label,
        toggleLabel,
        uiid,
        onpointerup,
        header,
        expandedContent,
        collapsedContent,
        footer,
    }: Props = $props();

    /** inline-start sidebars carry the knob on their right edge and grow right;
     *  inline-end sidebars carry it on their left edge and grow left. */
    let edge = $derived<'left' | 'right'>(side === 'start' ? 'right' : 'left');
    /** The Wellspring (start) mirrors the arrow so it still points "outward to
     *  expand"; the Annotations panel (end) uses the Expander's default glyphs. */
    let icons = $derived<[string, string]>(
        side === 'start' ? ['▼', '▲'] : ['▲', '▼'],
    );

    let dragging = $state(false);
    /** Live width: the committed setting, or the in-progress drag width. The
     *  ResizeHandle keeps this synced via `bind:live`; the prop just seeds it. */
    // svelte-ignore state_referenced_locally
    let renderedWidth = $state(width);
    /** The inner content width (section width minus padding + the editor-facing
     *  border). Pinned on the content so it lays out once and the section's
     *  width transition just reveals/clips it instead of reflowing mid-animation. */
    let contentWidth = $derived(
        `calc(${renderedWidth}px - 2 * var(--wordplay-spacing) - var(--wordplay-border-width))`,
    );

    /** A tight box near the arrow to anchor the whole-bar tooltip to, so it's
     *  placed like every other tip rather than off the whole wide section. */
    let tipAnchor = $state<HTMLElement | undefined>(undefined);
    const hint = getTip();

    /** Interactive children handle their own press/hover, so the whole-bar
     *  toggle and tooltip ignore them. */
    const INTERACTIVE =
        'button, a, input, [role="button"], [role="textbox"], [role="separator"]';

    function overEmptySpace(event: Event) {
        return (
            event.target instanceof Element &&
            event.target.closest(INTERACTIVE) === null
        );
    }

    /**
     * Toggle when empty bar space is pressed. We use `pointerdown` (not `click`)
     * because expanding changes the layout mid-gesture, which would defeat a
     * click-target guard and toggle twice.
     */
    function handlePointerDown(event: PointerEvent) {
        if (overEmptySpace(event)) toggle();
    }

    /** Show the toggle tooltip over non-interactive bar area; hide otherwise.
     *  `pointerover` bubbles and fires per element entered, so it tracks the
     *  pointer moving between background and content. */
    function handlePointerOver(event: PointerEvent) {
        if (overEmptySpace(event) && tipAnchor)
            hint.showMarkup(
                $locales.getMultilingualMarkup(toggleLabel),
                tipAnchor,
            );
        else hint.hide();
    }
    function hideTip() {
        hint.hide();
    }
</script>

<!-- The frame is the positioning context for the resize knob, which sits half
     past the section's edge and must not be clipped by the section's overflow. -->
<div class="sidebar-frame {side}" class:expanded>
    {#if expanded}
        <ResizeHandle
            {edge}
            {width}
            {min}
            {max}
            {commit}
            bind:live={renderedWidth}
            bind:dragging
        />
    {/if}
    <!-- The Expander is the keyboard-accessible toggle; the section handlers are
         a convenience so empty space toggles and shows the tooltip too. -->
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <section
        aria-label={$locales.getPlainText(label)}
        class:expanded
        class:dragging
        class:start={side === 'start'}
        data-uiid={uiid}
        style:width={expanded ? `${renderedWidth}px` : null}
        style:min-width={expanded ? `${renderedWidth}px` : null}
        style:max-width={expanded ? `${renderedWidth}px` : null}
        onpointerdown={handlePointerDown}
        onpointerover={handlePointerOver}
        onpointerleave={hideTip}
        {onpointerup}
    >
        <span class="tip-anchor" bind:this={tipAnchor}>
            <Expander {expanded} {toggle} vertical={false} {icons} label={toggleLabel} />
        </span>
        {#if expanded && header}
            <div class="header" style:width={contentWidth}>
                {@render header()}
            </div>
        {/if}
        <div
            class="scroll"
            class:expanded
            style:width={expanded ? contentWidth : null}
        >
            {#if expanded}
                {@render expandedContent()}
            {:else if collapsedContent}
                {@render collapsedContent()}
            {/if}
        </div>
        {@render footer?.()}
    </section>
</div>

<style>
    .sidebar-frame {
        position: relative;
        height: 100%;
        display: flex;
    }

    section {
        position: relative;
        padding: var(--wordplay-spacing);
        /* The section doesn't scroll; the inner `.scroll` does, so the footer
           (and any sticky header inside the content) stays pinned. */
        overflow: hidden;
        height: 100%;
        /* The whole bar toggles expand/collapse, so show the hand cursor. */
        cursor: pointer;
        max-width: 2em;
        min-width: 2em;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        transition:
            max-width calc(var(--animation-factor) * 100ms),
            min-width calc(var(--animation-factor) * 100ms);
    }

    /* The border sits on the edge facing the editor. */
    .sidebar-frame:not(.start) section {
        border-inline-start: solid var(--wordplay-border-width)
            var(--wordplay-border-color);
    }
    .sidebar-frame.start section {
        border-inline-end: solid var(--wordplay-border-width)
            var(--wordplay-border-color);
    }

    /* During the drag itself, suppress the width transition for responsiveness. */
    section.expanded.dragging {
        transition: none;
    }

    /* Center the expander, collapsed content, and footer in the thin bar. */
    section:not(:global(.expanded)) {
        align-items: center;
    }

    .tip-anchor {
        display: inline-block;
        width: fit-content;
    }

    /* Pin the expander to the inline-end of an expanded inline-start sidebar. */
    .sidebar-frame.start section.expanded .tip-anchor {
        align-self: flex-end;
    }

    /* Pinned above the scroll region (doesn't scroll). */
    .header {
        flex-shrink: 0;
    }

    .scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
    }

    /* When collapsed, the scroll region centers its items (e.g. conflict dots). */
    .scroll:not(.expanded) {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
