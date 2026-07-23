<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import {
        MULTILINGUAL_SEPARATOR,
        type MultilingualEntry,
    } from '@locale/Locales';
    import type { ModeText } from '@locale/UITexts';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { withMonoEmoji } from '@unicode/emoji';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';

    interface Props {
        /** Localized text for the labels and tooltips */
        modes: (locale: LocaleText) => ModeText<readonly string[]>;
        /** The current mode selected, or undefined for no selection (no
         *  button is rendered selected — used when another control supersedes
         *  the mode). */
        choice: number | undefined;
        /** Callback for when a mode is selected.*/
        select: (choice: number) => void;
        /** Icons to add as prefixes to labels */
        icons?: readonly string[];
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
        /** When true, stack the buttons vertically (column) instead of in a row.
         *  Used by the blocks-mode Wellspring's icon-only category chooser. */
        vertical?: boolean;
        /** An optional data-uiid placed on the button group, for tutorial highlighting. */
        uiid?: string;
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
        vertical = false,
        uiid = undefined,
    }: Props = $props();

    let modeText = $derived($locales.getTextStructure(modes));
    let label = $derived(withoutAnnotations(modeText.label));

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
    function tipTitleFor(index: number) {
        return tipEntriesFor(index)
            .map((entry) => entry.text)
            .join(MULTILINGUAL_SEPARATOR);
    }
    function showTip(view: HTMLButtonElement, entries: MultilingualEntry[]) {
        if (entries.length > 0) hint.showMultilingual(entries, view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<div class="mode" class:grid class:vertical>
    {#if labeled}
        <label class="label" for={label}>{label}</label>
    {/if}
    <div
        class="group"
        class:wrap
        class:vertical
        role="radiogroup"
        id={label}
        aria-labelledby={label}
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
                    aria-label={tipTitleFor(index)}
                    aria-disabled={!active || index === choice}
                    ondblclick={(event) => event.stopPropagation()}
                    onpointerdown={(event) => {
                        event.preventDefault();
                        if (index !== choice && event.button === 0 && active)
                            select(index);
                    }}
                    onpointerenter={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            tipEntriesFor(index),
                        )}
                    onpointerleave={hideTip}
                    onfocus={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            tipEntriesFor(index),
                        )}
                    onblur={hideTip}
                    ontouchstart={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            tipEntriesFor(index),
                        )}
                    ontouchend={hideTip}
                    ontouchcancel={hideTip}
                    onkeydown={(event) =>
                        (event.key === 'Enter' || event.key === ' ') &&
                        // Only activate with no modifiers down. Enter is used for other shortcuts.
                        !event.shiftKey &&
                        !event.ctrlKey &&
                        !event.altKey &&
                        !event.metaKey
                            ? select(index)
                            : undefined}
                >
                    {#if icons}{#if index < icons.length}{withMonoEmoji(
                                icons[index],
                            )}{:else}?{/if}{/if}
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

    .label {
        font-style: italic;
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

    button:focus {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        fill: var(--wordplay-background);
        outline: none;
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
        border-radius: var(--wordplay-border-radius) var(--wordplay-border-radius)
            0 0;
    }

    .group.vertical button:last-child {
        border-radius: 0 0 var(--wordplay-border-radius)
            var(--wordplay-border-radius);
    }

    button:not(:global(.selected)):hover {
        background: var(--wordplay-hover);
        /* Keep nested links legible on the gold hover background (#1216). */
        --wordplay-link-color: var(--color-white);
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
        user-select: none;
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

    .group.wrap {
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
