<!-- A tab bar attached to the panel of content it switches between.

     Sibling of Mode, and deliberately shares its ModeText locale shape, tooltips,
     and inline localization editing. Use Mode when choosing an option changes a
     setting or filters a list in place; use Tabbed when it swaps the page of
     content shown below, which is what the tab role and the visual attachment to
     the panel both communicate. -->
<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import {
        getFocusableOption,
        getNextOption,
    } from '@components/widgets/optionNavigation';
    import OptionTips from '@components/widgets/OptionTips.svelte';
    import { locales } from '@db/Database';
    import { type MultilingualEntry } from '@locale/Locales';
    import type LocaleText from '@locale/LocaleText';
    import type { ModeText } from '@locale/UITexts';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { withMonoEmoji } from '@unicode/emoji';
    import type { Snippet } from 'svelte';

    interface Props {
        /** Localized text for the labels and tooltips. */
        tabs: (locale: LocaleText) => ModeText<readonly string[]>;
        /** The tab selected, or undefined for no selection (no tab renders
         *  selected, but the bar still holds exactly one tab stop). */
        choice: number | undefined;
        /** Callback for when a tab is selected. */
        select: (choice: number) => void;
        /** The content the tabs switch between. When given, Tabbed renders the
         *  tabpanel itself, which is what guarantees the selected tab merges
         *  with it. Omit when the panel can't be a child — a scroll container or
         *  a sticky header's sibling — and instead pass `id` and put
         *  id="{id}-panel" role="tabpanel" on the panel yourself. */
        children?: Snippet;
        /** Icons to add as prefixes to labels. */
        icons?: readonly string[];
        /** Tabs to omit, allowing for conditional display. Remaining indices keep
         *  their numbering, so `choice` and `labels` stay aligned. */
        omit?: readonly number[];
        /** Optional annotation text appended after each tab's label (e.g. a count).
         *  Use `undefined` at a given index to skip annotating that tab. */
        annotations?: readonly (string | undefined)[];
        /** Whether to wrap the row of tabs. Good if there are many. */
        wrap?: boolean;
        /** Whether to show the group's label before the bar. Off by default,
         *  since tabs are self-describing; the label names the tab list for
         *  screen readers either way. */
        labeled?: boolean;
        /** True when the visible labels are symbols rather than words, as in the
         *  emoji category tabs. Their tips are the real names, so they become the
         *  tabs' accessible names and the symbols are hidden from screen readers. */
        iconic?: boolean;
        /** DOM id prefix. Required when rendering the tabpanel yourself. */
        id?: string;
        /** An optional data-uiid placed on the tab list, for tutorial highlighting. */
        uiid?: string;
    }

    let {
        tabs,
        choice,
        select,
        children,
        icons,
        omit = [],
        annotations,
        wrap = false,
        labeled = false,
        iconic = false,
        id,
        uiid = undefined,
    }: Props = $props();

    // The ARIA wiring needs ids that are stable across a render and identical on
    // server and client, so fall back to Svelte's hydration-safe generated id.
    // Reading `id` once here is deliberate: it identifies this instance.
    const generated = $props.id();
    // svelte-ignore state_referenced_locally
    const group = id ?? generated;
    const panelID = `${group}-panel`;
    const labelID = `${group}-label`;
    const tabID = (index: number) => `${group}-tab-${index}`;

    /** Only claim to control a panel when one exists, so aria-controls never
     *  dangles. A caller-rendered panel is signalled by passing `id`. */
    let panel = $derived(children !== undefined || id !== undefined);

    let tabText = $derived($locales.getTextStructure(tabs));
    let label = $derived(withoutAnnotations(tabText.label));
    /** The tab list's accessible name — primary locale only; the visible
     *  hints carry the multilingual echo. */
    let labelTitle = $derived(
        $locales.getPrimaryPlainText((l) => tabs(l).label),
    );

    /** The tabs actually rendered, in visual order, so arrow keys skip omitted ones. */
    let visible = $derived(
        tabText.labels
            .map((_, index) => index)
            .filter((index) => !omit.includes(index)),
    );
    /** The tab holding the bar's single tab stop. */
    let focusable = $derived(getFocusableOption(visible, choice));
    /** Inline arrow keys follow reading order, so they swap under an RTL locale. */
    let rtl = $derived($locales.getDirection() === 'rtl');

    let views = $state<(HTMLButtonElement | undefined)[]>([]);
    let barView = $state<HTMLDivElement | undefined>(undefined);

    /** Whether the bar is showing more than one row. */
    let wrapped = $state(false);
    /** Whether the selected tab sits above the bottom row. Only a tab in the
     *  bottom row can reach the rule, so that's the only one that can merge with
     *  the panel; a higher one reads as a raised, closed box instead, leaving the
     *  rule unbroken rather than pretending to a continuity it doesn't have. */
    let stacked = $state(false);
    $effect(() => {
        const bar = barView;
        // Re-measure when the tabs or the selection change, not just on resize.
        void visible;
        const selectedIndex = choice;
        if (bar === undefined || !wrap) {
            wrapped = false;
            stacked = false;
            return;
        }
        const measure = () => {
            const tops = [
                ...bar.querySelectorAll<HTMLElement>('[role=tab]'),
            ].map((tab) => tab.offsetTop);
            wrapped = tops.some((top) => top !== tops[0]);
            const selected =
                selectedIndex === undefined ? undefined : views[selectedIndex];
            stacked =
                wrapped &&
                selected !== undefined &&
                selected.offsetTop !== Math.max(...tops);
        };
        measure();
        // Both states only change block-direction geometry, so neither can change
        // whether the bar wraps and set off an oscillation.
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    });

    let hint = getTip();
    let localizing = getLocalizing();
    // Per-index edit state so we can hide a tab's tip badge while its label is
    // being edited (and vice versa).
    let labelEditing = $state<Record<number, boolean>>({});
    let tipEditing = $state<Record<number, boolean>>({});

    // One tooltip line per chosen locale for the tab at `index`.
    function tipEntriesFor(index: number) {
        return $locales.getMultilingualFrom(tabs, (text) => text.tips[index]);
    }
    /** A tab's aria description text — primary locale only. */
    function tipTitleFor(index: number) {
        return $locales.getPrimaryPlainText((l) => tabs(l).tips[index]);
    }
    function showTip(view: HTMLButtonElement, entries: MultilingualEntry[]) {
        if (entries.length > 0) hint.showMultilingual(entries, view);
    }
    function hideTip() {
        hint.hide();
    }

    /** Tabs activate automatically: keyboard navigation selects as it moves, so
     *  the focused tab is always the selected one. */
    function activate(index: number) {
        if (index !== choice) select(index);
        views[index]?.focus();
    }

    function handleKey(event: KeyboardEvent, index: number) {
        const next = getNextOption(visible, index, event.key, rtl);
        if (next !== undefined) activate(next);
        else if (
            (event.key === 'Enter' || event.key === ' ') &&
            // Only activate with no modifiers down. Enter is used for other shortcuts.
            !event.shiftKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
        ) {
            if (index !== choice) select(index);
        } else return;
        event.preventDefault();
        // Views that bind arrow keys to their own navigation enclose tab bars
        // (e.g. the tutorial steps lessons with left/right), so moving within
        // the bar must not also drive them.
        event.stopPropagation();
    }
</script>

<div class="tabbed">
    {#if labeled}
        <span class="label" id={labelID}>{label}</span>
    {/if}
    <div
        class="tabs"
        class:wrap
        class:wrapped
        class:stacked
        bind:this={barView}
        role="tablist"
        aria-orientation="horizontal"
        aria-label={labeled ? undefined : labelTitle}
        aria-labelledby={labeled ? labelID : undefined}
        data-uiid={uiid}
    >
        {#each tabText.labels, index}
            {#if !omit.includes(index)}
                <!-- We prevent pointer down default to avoid stealing keyboard focus. -->
                <button
                    type="button"
                    role="tab"
                    id={tabID(index)}
                    aria-selected={index === choice}
                    aria-controls={panel ? panelID : undefined}
                    aria-label={iconic ? tipTitleFor(index) : undefined}
                    aria-describedby={iconic
                        ? undefined
                        : `${group}-tip-${index}`}
                    tabindex={index === focusable ? 0 : -1}
                    bind:this={views[index]}
                    ondblclick={(event) => event.stopPropagation()}
                    onpointerdown={(event) => {
                        event.preventDefault();
                        if (index !== choice && event.button === 0)
                            select(index);
                    }}
                    onpointerenter={(event) =>
                        canHoverTips()
                            ? showTip(event.currentTarget, tipEntriesFor(index))
                            : undefined}
                    onpointerleave={hideTip}
                    onfocus={(event) =>
                        canFocusTips(event.currentTarget)
                            ? showTip(event.currentTarget, tipEntriesFor(index))
                            : undefined}
                    onblur={hideTip}
                    onkeydown={(event) => handleKey(event, index)}
                >
                    {#if icons}<span class="icon" aria-hidden="true"
                            >{#if index < icons.length}{withMonoEmoji(
                                    icons[index],
                                )}{:else}?{/if}</span
                        >{/if}{#if !tipEditing[index]}<span
                            class="text"
                            aria-hidden={iconic ? 'true' : undefined}
                            ><LocalizedText
                                path={tabs}
                                extras={['labels', index]}
                                onEditingChange={(e) =>
                                    (labelEditing[index] = e)}
                            /></span
                        >{/if}{#if annotations && annotations[index] !== undefined}<span
                            class="annotation">{annotations[index]}</span
                        >{/if}{#if localizing?.on && !labelEditing[index]}<LocalizedText
                            path={tabs}
                            extras={['tips', index]}
                            tipIcon
                            onEditingChange={(e) => (tipEditing[index] = e)}
                        />{/if}
                </button>
            {/if}
        {/each}
    </div>
    {#if !iconic}
        <OptionTips
            id={group}
            tips={tabText.labels.map((_, index) => tipTitleFor(index))}
            {omit}
        />
    {/if}
    {#if children}
        <div
            class="panel"
            role="tabpanel"
            id={panelID}
            aria-labelledby={choice !== undefined && visible.includes(choice)
                ? tabID(choice)
                : undefined}
        >
            {@render children()}
        </div>
    {/if}
</div>

<style>
    .tabbed {
        display: flex;
        flex-direction: column;
        /* No gap: the selected tab must sit flush against the panel it merges into. */
        min-width: 0;
        width: 100%;
    }

    .label {
        font-style: italic;
        margin-inline-start: var(--wordplay-spacing);
        margin-block-end: var(--wordplay-spacing-half);
    }

    /* The rule the tabs attach to. The selected tab overhangs it and hides its own
       segment, since a child's background paints over its parent's border. */
    .tabs {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: var(--wordplay-spacing-half);
        padding-inline-start: var(--wordplay-spacing);
        border-block-end: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        white-space: nowrap;
        user-select: none;
        min-width: 0;
        /* Deliberately no overflow: clipping would cut the overhang that makes the
           selected tab merge with the panel. Use `wrap` for bars that don't fit. */
    }

    /* A selection above the bottom row can't reach the rule, so rather than fake
       the merge it becomes a closed, raised box — the same bottom-and-end offset
       edge the other controls use — and the rule below it stays unbroken. */
    .tabs.stacked button[aria-selected='true'] {
        margin-block-end: 0;
        border-block-end: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-end-start-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
    }

    /* Rows sit flush so the stack reads as one block. */
    .tabs.wrap {
        flex-wrap: wrap;
        white-space: normal;
        row-gap: 0;
    }

    /* Across rows, a little air reads better than flush edges — a raised box in an
       upper row would otherwise sit right on top of the row beneath it. */
    .tabs.wrapped {
        row-gap: var(--wordplay-spacing-half);
    }

    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--wordplay-spacing-half);
        /* Anchors this tab's localization tip badge to its own corner. */
        position: relative;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
        /* Drop native rendering and pin the line box so a tall fallback-font icon
           glyph can't inflate the tab's height. */
        appearance: none;
        line-height: 1;
        cursor: pointer;
        white-space: nowrap;
        color: var(--wordplay-foreground);
        background: none;
        padding: var(--wordplay-spacing);
        /* Guarantees the 24x24 minimum target size regardless of locale font metrics. */
        min-block-size: 24px;
        min-inline-size: 24px;
        /* Every tab reserves the selected one's border so selecting never changes
           the bar's height; only the selected tab colors it in. */
        border: var(--wordplay-border-width) solid transparent;
        border-block-end: none;
        border-start-start-radius: var(--wordplay-border-radius);
        border-start-end-radius: var(--wordplay-border-radius);
        /* Overhang the rule by exactly its width, so the selected tab's background
           covers that segment and joins the panel below. */
        margin-block-end: calc(-1 * var(--wordplay-border-width));
        transition: background-color calc(var(--animation-factor) * 100ms);
    }

    button[aria-selected='true'] {
        /* An unbroken border gives the selected tab its own form, and the offset
           inline-end edge is the raised motif the other controls use. Only that
           edge carries the offset: one on the block end would draw a line beneath
           the tab and break the merge with the panel that marks it as content. */
        border-color: var(--wordplay-border-color);
        background: var(--wordplay-background);
        box-shadow: var(--wordplay-border-width) 0 0
            var(--wordplay-border-color);
        cursor: default;
    }

    /* The bar reserves the raised edge's width at its inline end so the last tab
       can carry the offset without widening the row. */
    .tabs {
        padding-inline-end: var(--wordplay-border-width);
    }

    button:not([aria-selected='true']):hover {
        background: var(--wordplay-hover);
        /* Text and links on the gold, per --wordplay-hover-text in app.html:
           --wordplay-foreground is white in dark mode and measures 3.58:1 here,
           and the old --color-white link override measured 3.01:1 in light
           (#1216). The orange underline is what still marks a link. */
        color: var(--wordplay-hover-text);
        --wordplay-link-color: currentColor;
        --wordplay-link-underline-color: var(--color-orange);
    }

    /* Inset so the focus ring isn't clipped by the panel edge, and raised so a
       neighboring tab can't paint over it. */
    button:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
        z-index: 1;
    }

    .annotation {
        font-variant-numeric: tabular-nums;
        color: var(--wordplay-inactive-color);
    }

    /* Match the selected/focused label color so the count stays legible against
       the highlight or focus background instead of fading into it. */
    button[aria-selected='true'] .annotation,
    button:focus .annotation {
        color: inherit;
    }

    .panel {
        display: flex;
        flex-direction: column;
        gap: var(--tabbed-panel-gap, var(--wordplay-spacing));
        padding-block-start: var(--wordplay-spacing);
        min-width: 0;
    }
</style>
