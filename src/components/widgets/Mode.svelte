<script lang="ts">
    import { getTip } from '@components/project/Contexts';
    import { locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import type { ModeText } from '@locale/UITexts';
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

    let modeText = $derived($locales.get(modes));

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
        <label class="label" for={modeText.label}>{modeText.label}</label>
    {/if}
    <div
        class="group"
        class:wrap
        role="radiogroup"
        id={modeText.label}
        aria-labelledby={modeText.label}
    >
        {#each modeText.labels, index}
            {#if !omit.includes(index)}
                <!-- We prevent mouse down default to avoid stealing keyboard focus. -->
                <button
                    type="button"
                    role="radio"
                    aria-checked={index === choice}
                    class:selected={index === choice}
                    aria-label={modeText.tips[index]}
                    aria-disabled={!active || index === choice}
                    ondblclick={(event) => event.stopPropagation()}
                    onpointerdown={(event) =>
                        index !== choice && event.button === 0 && active
                            ? select(index)
                            : undefined}
                    onpointerenter={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            modeText.tips[index],
                        )}
                    onpointerleave={hideTip}
                    onfocus={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            modeText.tips[index],
                        )}
                    onblur={hideTip}
                    ontouchstart={(event) =>
                        showTip(
                            event.target as HTMLButtonElement,
                            modeText.tips[index],
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
                            path={(l) => modeText.labels[index]}
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
        font-weight: var(--wordplay-font-weight);
        cursor: pointer;
        width: fit-content;
        white-space: nowrap;
        border: 1px solid var(--wordplay-chrome);
        color: var(--wordplay-foreground);
        background-color: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        transition: transform calc(var(--animation-factor) * 200ms);
        cursor: pointer;
    }

    button.selected {
        color: var(--wordplay-background);
        background: var(--wordplay-highlight-color);
        transform: scale(1.05);
        cursor: default;
    }

    button:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
    }

    button:first-child {
        border-top-left-radius: var(--wordplay-border-radius);
        border-bottom-left-radius: var(--wordplay-border-radius);
        border-left: 1px solid var(--wordplay-chrome);
    }

    button:last-child {
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
        border-right: 1px solid var(--wordplay-chrome);
    }

    button:not(:global(.selected)):hover {
        transform: scale(1.05);
        background: var(--wordplay-hover);
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
        row-gap: var(--wordplay-focus-width);
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
