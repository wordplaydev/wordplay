<svelte:options immutable={true} />

<script lang="ts">
    export let label: string;
    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
</script>

<button
    title={tip}
    tabIndex={0}
    on:click={action}
    on:mousedown|stopPropagation
    disabled={!enabled}
    on:keydown={(event) =>
        event.key === 'Enter' || event.key === 'Space' ? action() : undefined}
>
    {label}
</button>

<style>
    button {
        display: inline-block;
        background-color: var(--wordplay-chrome);
        color: var(--wordplay-foreground);
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        transition: transform 0.25s;
        transform-origin: center;
    }

    button:hover:not(:disabled) {
        cursor: pointer;
        background-color: var(--wordplay-border-color);
        border-color: var(--wordplay-highlight);
        transform: scale(1.1, 1.1);
        z-index: 2;
    }

    button:disabled {
        cursor: default;
        background: none;
        color: var(--wordplay-disabled-color);
    }
</style>
