<script lang="ts">
    import type { ModeText } from '../../locale/UITexts';
    import { withMonoEmoji } from '../../unicode/emoji';

    interface Props {
        descriptions: ModeText<string[]>;
        modes: string[];
        choice: number;
        select: (choice: number) => void;
        active?: boolean;
        labeled?: boolean;
    }

    let {
        descriptions,
        modes,
        choice,
        select,
        active = true,
        labeled = true,
    }: Props = $props();
</script>

<div class="mode">
    {#if labeled}
        <span class="label" id={descriptions.label}>{descriptions.label}</span>
    {/if}
    <div class="group" role="radiogroup" aria-labelledby={descriptions.label}>
        {#each modes as mode, index}
            <!-- We prevent mouse down default to avoid stealing keyboard focus. -->
            <button
                type="button"
                role="radio"
                aria-checked={index === choice}
                class:selected={index === choice}
                aria-label={descriptions.modes[index]}
                title={descriptions.modes[index]}
                aria-disabled={!active || index === choice}
                ondblclick={(event) => event.stopPropagation()}
                onmousedown={(event) => event.preventDefault()}
                onpointerdown={(event) =>
                    index !== choice && event.button === 0 && active
                        ? select(index)
                        : undefined}
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
                {withMonoEmoji(mode)}
            </button>
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
        align-items: center;
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
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        transition: transform calc(var(--animation-factor) * 200ms);
        cursor: pointer;
    }

    button:focus {
        outline: none;
        color: var(--wordplay-focus-color);
    }

    button.selected {
        background-color: var(--wordplay-alternating-color);
        cursor: default;
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

    button:not(:global(.selected)) {
        transform: scale(1.1);
    }

    button:not(:global(.selected)):hover {
        background: var(--wordplay-alternating-color);
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

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
