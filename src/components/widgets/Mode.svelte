<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import type { ModeText } from '@locale/UITexts';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import { withMonoEmoji } from '../../unicode/emoji';
    import LocalizedText from './LocalizedText.svelte';

    interface Props {
        /** Localized text for the labels and tooltips */
        modes: (locale: LocaleText) => ModeText<readonly string[]>;
        /** The current mode selected */
        choice: number;
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
    }: Props = $props();

    let modeText = $derived($locales.getTextStructure(modes));
    let label = $derived(withoutAnnotations(modeText.label));

    let hint = getTip();
    function showTip(view: HTMLButtonElement, tip: string) {
        hint.show(tip, view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<div class="mode">
    {#if labeled}
        <label class="label" for={label}>{label}</label>
    {/if}
    <div
        class="group"
        class:wrap
        role="radiogroup"
        id={label}
        aria-labelledby={label}
    >
        {#each modeText.labels, index}
            {#if !omit.includes(index)}
                <!-- We prevent mouse down default to avoid stealing keyboard focus. -->
                <button
                    type="button"
                    role="radio"
                    aria-checked={index === choice}
                    class:selected={index === choice}
                    aria-label={$locales.getPlainText(modeText.tips[index])}
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
                            $locales.getPlainText(modeText.tips[index]),
                        )}
                    onpointerleave={hideTip}
                    onfocus={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            $locales.getPlainText(modeText.tips[index]),
                        )}
                    onblur={hideTip}
                    ontouchstart={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            $locales.getPlainText(modeText.tips[index]),
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
                    {#if modeLabels}<LocalizedText
                            path={() =>
                                $locales.getPlainText(modeText.labels[index])}
                        />{/if}
                </button>
            {/if}
        {/each}
    </div>
</div>

<style>
    .mode {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        white-space: nowrap;
        align-items: baseline;
    }

    .label {
        font-style: italic;
    }

    button {
        display: inline-block;
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        font-weight: var(--wordplay-font-weight);
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
        box-shadow: inset var(--wordplay-border-width) var(--wordplay-border-width)
            0 var(--wordplay-foreground);
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

    button:not(:global(.selected)):hover {
        background: var(--wordplay-hover);
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
