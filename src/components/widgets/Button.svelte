<svelte:options immutable={true} />

<script lang="ts">
    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
    export let stretch: boolean = false;
</script>

<!-- Note that we don't disable the button using disabled because that makes
    it invisible to screen readers. -->
<button
    class:stretch
    title={tip}
    tabIndex="0"
    on:click={() => (enabled ? action() : undefined)}
    on:mousedown
    disabled={!enabled}
    aria-disabled={!enabled}
>
    <slot />
</button>

<style>
    button {
        display: inline-block;
        background-color: var(--wordplay-chrome);
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        font-weight: var(--wordplay-font-weight);
        transform-origin: center;
        user-select: none;
        border: none;
        background: none;
        padding: 0;
        margin: calc(var(--wordplay-spacing) / 2);
        color: currentcolor;
        cursor: pointer;
        width: fit-content;
        white-space: nowrap;
    }

    button.stretch {
        width: inherit;
        height: inherit;
    }

    :global(.animated) button {
        transition: transform;
        transition-duration: 200ms;
    }

    button:disabled {
        cursor: default;
        background: none;
        color: var(--wordplay-disabled-color);
    }

    button:focus:not(:disabled),
    button:hover:not(:disabled) {
        transform: scale(1.1);
        outline: none;
        color: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }
</style>
