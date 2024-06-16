<svelte:options immutable={true} />

<script lang="ts">
    import type { ModeText } from '../../locale/UITexts';

    export let descriptions: ModeText<string[]>;
    export let modes: string[];
    export let choice: number;
    export let select: (choice: number) => void;
    export let active = true;
</script>

<div class="mode">
    <span class="label" id={descriptions.label}>{descriptions.label}</span>
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
                aria-disabled={!active}
                on:dblclick|stopPropagation
                on:mousedown|preventDefault
                on:pointerdown={(event) =>
                    index !== choice && event.button === 0 && active
                        ? select(index)
                        : undefined}
                on:keydown={(event) =>
                    (event.key === 'Enter' || event.key === ' ') &&
                    // Only activate with no modifiers down. Enter is used for other shortcuts.
                    !event.shiftKey &&
                    !event.ctrlKey &&
                    !event.altKey &&
                    !event.metaKey
                        ? select(index)
                        : undefined}
            >
                {mode}
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
        font-family: var(--wordplay-app-font);
        font-weight: var(--wordplay-font-weight);
        cursor: pointer;
        width: fit-content;
        white-space: nowrap;
        border: none;
        color: var(--wordplay-foreground);
        background: none;
        padding: var(--wordplay-spacing);
        transition: transform calc(var(--animation-factor) * 200ms);
        cursor: pointer;
    }

    button:focus {
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    button.selected {
        background-color: var(--wordplay-alternating-color);
        cursor: default;
    }

    button:first-child {
        border-top-left-radius: var(--wordplay-border-radius);
        border-bottom-left-radius: var(--wordplay-border-radius);
    }

    button:last-child {
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

    button:not(.selected):hover {
        transform: scale(1.1);
    }

    .group {
        border: none;
        padding: 0;
        white-space: nowrap;
        border: 1px solid var(--wordplay-chrome);
        border-radius: var(--wordplay-border-radius);
        user-select: none;
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
