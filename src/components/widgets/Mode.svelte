<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import OptionTips from '@components/widgets/OptionTips.svelte';
    import Synced from '@components/widgets/Synced.svelte';
    import {
        getFocusableOption,
        getNextOption,
    } from '@components/widgets/optionNavigation';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import { type MultilingualEntry } from '@locale/Locales';
    import type { ModeText } from '@locale/UITexts';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { withDefaultMonoEmoji } from '@unicode/emoji';
    import type { Component } from 'svelte';

    interface Props {
        /** Localized text for the labels and tooltips */
        modes: (locale: LocaleText) => ModeText<readonly string[]>;
        /** The current mode selected, or undefined for no selection (no
         *  button is rendered selected — used when another control supersedes
         *  the mode). */
        choice: number | undefined;
        /** Callback for when a mode is selected.*/
        select: (choice: number) => void;
        /** Icons to add as prefixes to labels: a glyph string (rendered
         *  monochrome unless it already carries a presentation selector, so a
         *  mode whose subject IS the presentation can show one of each) or a
         *  drawn icon component, for marks whose codepoints render
         *  unpredictably across platforms (e.g. the playback glyphs). */
        icons?: readonly (string | Component)[];
        /** Whether the mode chooser is active */
        active?: boolean;
        /** Whether to add a label before the mode chooser*/
        labeled?: boolean;
        /** Whether to add labels to the individual mode buttons */
        modeLabels?: boolean;
        /** Whether to wrap the row of buttons. Good if there are many. */
        wrap?: boolean;
        /** Buttons to omit, allowing for conditional display of modes */
        omit?: readonly number[];
        /** Optional annotation text appended after each mode's label (e.g. a count).
         *  Use `undefined` at a given index to skip annotating that button. */
        annotations?: readonly (string | undefined)[];
        /** When true, the label and button group are laid out via `display: contents`
         *  so they become items of a parent grid (the label right-aligns, the group
         *  left-aligns). Lets multiple Modes align into a filter grid. */
        grid?: boolean;
        /** With `grid`, step this row's button group in from the column's start
         *  edge to show it depends on the setting above it. The label stays on
         *  the shared right edge, so nesting reads without breaking the column
         *  — which is why the offset lands on the group and not the label. */
        indented?: boolean;
        /** When true, stack the buttons vertically (column) instead of in a row.
         *  Used by the blocks-mode Wellspring's icon-only category chooser. */
        vertical?: boolean;
        /** An optional data-uiid placed on the button group, for tutorial highlighting. */
        uiid?: string;
        /** Whether this setting follows the creator's account rather than staying
         *  on this device, marked with a cloud after the buttons. */
        synced?: boolean;
    }

    let {
        modes,
        icons,
        choice,
        select,
        active = true,
        labeled = true,
        modeLabels = true,
        wrap = false,
        omit = [],
        annotations,
        grid = false,
        indented = false,
        vertical = false,
        uiid = undefined,
        synced = false,
    }: Props = $props();

    // The ARIA wiring needs ids that are stable across a render and identical on
    // server and client. Never derive them from the localized label: the same
    // label recurs across widgets, and many locales don't yield a valid id.
    const group = $props.id();
    const labelID = `${group}-label`;

    let modeText = $derived($locales.getTextStructure(modes));
    let label = $derived(withoutAnnotations(modeText.label));
    /** The group's accessible name — primary locale only; the visible hints
     *  carry the multilingual echo. */
    let labelTitle = $derived(
        $locales.getPrimaryPlainText((l) => modes(l).label),
    );

    /** The modes actually rendered, in visual order, so arrow keys skip omitted ones. */
    let visible = $derived(
        modeText.labels
            .map((_, index) => index)
            .filter((index) => !omit.includes(index)),
    );
    /** The mode holding the group's single tab stop. */
    let focusable = $derived(getFocusableOption(visible, choice));
    /** Inline arrow keys follow reading order, so they swap under an RTL locale. */
    let rtl = $derived($locales.getDirection() === 'rtl');

    let views = $state<(HTMLButtonElement | undefined)[]>([]);

    let hint = getTip();
    let localizing = getLocalizing();
    // Per-index edit state so we can hide a mode button's tip badge while its
    // label is being edited (and vice versa).
    let labelEditing = $state<Record<number, boolean>>({});
    let tipEditing = $state<Record<number, boolean>>({});
    // One tooltip line per chosen locale for the mode at `index`.
    function tipEntriesFor(index: number) {
        return $locales.getMultilingualFrom(modes, (text) => text.tips[index]);
    }
    /** A mode button's aria description text — primary locale only. */
    function tipTitleFor(index: number) {
        return $locales.getPrimaryPlainText((l) => modes(l).tips[index]);
    }
    function showTip(view: HTMLButtonElement, entries: MultilingualEntry[]) {
        if (entries.length > 0) hint.showMultilingual(entries, view);
    }
    function hideTip() {
        hint.hide();
    }

    function choose(index: number) {
        if (active && index !== choice) select(index);
    }

    /** A radio group is one tab stop: arrows move between its radios, selecting
     *  as they go, rather than each radio being its own tab stop. */
    function handleKey(event: KeyboardEvent, index: number) {
        const next = getNextOption(visible, index, event.key, rtl);
        if (next !== undefined) {
            choose(next);
            views[next]?.focus();
        } else if (
            (event.key === 'Enter' || event.key === ' ') &&
            // Only activate with no modifiers down. Enter is used for other shortcuts.
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        )
            choose(index);
        else return;
        event.preventDefault();
        // Views that bind arrow keys to their own navigation enclose mode groups
        // (e.g. the tutorial steps lessons with left/right), so moving within the
        // group must not also drive them.
        event.stopPropagation();
    }
</script>

{#snippet buttons()}
    <div
        class="group"
        class:wrap
        class:vertical
        class:indented
        role="radiogroup"
        aria-label={labeled ? undefined : labelTitle}
        aria-labelledby={labeled ? labelID : undefined}
        data-uiid={uiid}
    >
        {#each modeText.labels, index}
            {#if !omit.includes(index)}
                <!-- We prevent mouse down default to avoid stealing keyboard focus. -->
                <button
                    type="button"
                    role="radio"
                    aria-checked={index === choice}
                    class:selected={index === choice}
                    aria-label={modeLabels ? undefined : tipTitleFor(index)}
                    aria-describedby={modeLabels
                        ? `${group}-tip-${index}`
                        : undefined}
                    aria-disabled={!active || index === choice}
                    tabindex={index === focusable ? 0 : -1}
                    bind:this={views[index]}
                    ondblclick={(event) => event.stopPropagation()}
                    onpointerdown={(event) => {
                        event.preventDefault();
                        if (event.button === 0) choose(index);
                    }}
                    onpointerenter={(event) =>
                        canHoverTips()
                            ? showTip(
                                  event.target as HTMLButtonElement,
                                  tipEntriesFor(index),
                              )
                            : undefined}
                    onpointerleave={hideTip}
                    onfocus={(event) =>
                        canFocusTips(event.currentTarget)
                            ? showTip(
                                  event.target as HTMLButtonElement,
                                  tipEntriesFor(index),
                              )
                            : undefined}
                    onblur={hideTip}
                    onkeydown={(event) => handleKey(event, index)}
                >
                    {#if icons}<span
                            aria-hidden={modeLabels ? 'true' : undefined}
                            >{#if index < icons.length}{@const icon =
                                    icons[
                                        index
                                    ]}{#if typeof icon === 'string'}{withDefaultMonoEmoji(
                                        icon,
                                    )}{:else}{@const Icon = icon}<Icon
                                    />{/if}{:else}?{/if}</span
                        >{/if}
                    {#if modeLabels && !tipEditing[index]}<LocalizedText
                            path={modes}
                            extras={['labels', index]}
                            onEditingChange={(e) => (labelEditing[index] = e)}
                        />{/if}{#if annotations && annotations[index] !== undefined}<span
                            class="annotation">{annotations[index]}</span
                        >{/if}{#if localizing?.on && !labelEditing[index]}<LocalizedText
                            path={modes}
                            extras={['tips', index]}
                            tipIcon
                            onEditingChange={(e) => (tipEditing[index] = e)}
                        />{/if}
                </button>
            {/if}
        {/each}
    </div>
{/snippet}

<div class="mode" class:grid class:vertical>
    {#if labeled}
        <!-- A span, not a label: `for` only resolves against form controls, and a
             radiogroup isn't one, so the group references this with aria-labelledby. -->
        <span class="label" id={labelID}>{label}</span>
    {/if}
    {#if synced}
        <!-- Under `grid` a Mode contributes exactly two cells, so the badge
             shares the control cell with the buttons rather than claiming a
             third and shifting every cell after it by one. -->
        <span class="control">{@render buttons()}<Synced /></span>
    {:else}{@render buttons()}{/if}
    {#if modeLabels}
        <OptionTips
            id={group}
            tips={modeText.labels.map((_, index) => tipTitleFor(index))}
            {omit}
        />
    {/if}
</div>

<style>
    .annotation {
        margin-inline-start: var(--wordplay-spacing-half);
        font-variant-numeric: tabular-nums;
        color: var(--wordplay-inactive-color);
    }

    /* Match the active/focused label color so the count stays legible on the
       highlight or focus background instead of fading into it. */
    button.selected .annotation,
    button:focus .annotation {
        color: inherit;
    }

    .mode {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        white-space: nowrap;
        align-items: baseline;
    }

    .mode.vertical {
        flex-direction: column;
        align-items: stretch;
    }

    /* Dissolve the Mode's own box so its label and group become items of a parent grid
       (used to align several Modes into a filter grid). */
    .mode.grid {
        display: contents;
    }

    .mode.grid .label {
        justify-self: end;
        text-align: end;
    }

    /* Wide enough to read as a deliberate step rather than a misalignment. Only
       meaningful under `grid`, where every group shares one start edge to step
       from; in flow layout each row starts wherever its own label ended, so
       there is no edge an offset could be measured against. */
    .mode.grid .group.indented {
        margin-inline-start: calc(4 * var(--wordplay-spacing));
    }

    .label {
        font-style: italic;
    }

    /* Holds the button group and its cloud badge in a single grid cell, so a
       synced row still contributes exactly two cells like every other row. */
    .control {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing-half);
        align-items: baseline;
        min-width: 0;
    }

    button {
        display: inline-block;
        /* Anchors this option's localization tip badge to its own corner. */
        position: relative;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
        /* Drop native rendering and pin the line box so a tall fallback-font
           icon glyph (e.g. an emoji or math symbol) can't inflate the button's
           height or shift the baseline the row label aligns to. */
        appearance: none;
        line-height: 1;
        cursor: pointer;
        width: fit-content;
        /* Guarantees the 24x24 minimum target size regardless of locale font metrics. */
        min-block-size: 24px;
        min-inline-size: 24px;
        white-space: nowrap;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        color: var(--wordplay-foreground);
        background-color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transition:
            transform calc(var(--animation-factor) * 200ms),
            box-shadow calc(var(--animation-factor) * 100ms);
        cursor: pointer;
    }

    button.selected {
        color: var(--wordplay-background);
        background: var(--wordplay-highlight-color);
        box-shadow: inset var(--wordplay-border-width)
            var(--wordplay-border-width) 0 var(--wordplay-foreground);
        cursor: default;
    }

    /* Keep the app's focus ring rather than signalling focus by background color
       alone, and inset it so a neighboring button in the group can't clip it. */
    button:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        fill: var(--wordplay-background);
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
        z-index: 1;
    }

    button:first-child {
        border-top-left-radius: var(--wordplay-border-radius);
        border-bottom-left-radius: var(--wordplay-border-radius);
    }

    button:last-child {
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

    /* In a vertical group, round the top/bottom corners instead of left/right. */
    .group.vertical button:first-child {
        border-radius: var(--wordplay-border-radius)
            var(--wordplay-border-radius) 0 0;
    }

    .group.vertical button:last-child {
        border-radius: 0 0 var(--wordplay-border-radius)
            var(--wordplay-border-radius);
    }

    button:not(:global(.selected)):hover {
        background: var(--wordplay-hover);
        /* Text and links on the gold, per --wordplay-hover-text in app.html:
           --wordplay-foreground is white in dark mode and measures 3.58:1 here,
           and the old --color-white link override measured 3.01:1 in light
           (#1216). The orange underline is what still marks a link. */
        color: var(--wordplay-hover-text);
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: var(--color-orange);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transform: translate(-1px, -1px);
    }

    .group {
        display: flex;
        flex-direction: row;
        border: none;
        padding: 0;
        white-space: nowrap;
        /* border: 1px solid var(--wordplay-chrome); */
        border-radius: var(--wordplay-border-radius);
    }

    .group.vertical {
        flex-direction: column;
    }

    /* Vertical buttons share one uniform width (the widest button) instead of
       each sizing to its own content. */
    .group.vertical button {
        width: 100%;
        text-align: center;
    }

    /* A grid row's group always wraps, whether or not `wrap` was asked for: it
       sits in a shrinkable column (both parent grids give it `minmax(0, 1fr)`),
       so a group that can't wrap overflows its container rather than getting
       narrower — and which rows fit is a fact about the locale's labels, not
       something a call site can know. */
    .group.wrap,
    .mode.grid .group {
        flex-wrap: wrap;
        white-space: normal;
        row-gap: 0;
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
