<svelte:options immutable={true} />

<script lang="ts">
    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
    export let chromeless: boolean = false;
</script>

<button
    class:chromeless
    title={tip}
    tabIndex={0}
    on:click={action}
    on:mousedown
    disabled={!enabled}
>
    <slot />
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
        padding: var(--wordplay-spacing);
        user-select: none;
    }

    button:hover:not(:disabled) {
        cursor: pointer;
        border-color: var(--wordplay-highlight);
        transform: scale(1.1, 1.1);
    }

    button:disabled {
        cursor: default;
        background: none;
        color: var(--wordplay-disabled-color);
    }

    .chromeless {
        border: none;
        background: none;
        padding: 0;
        color: currentcolor;
    }

    .chromeless:hover:not(:disabled) {
        border: none;
        color: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    .chromeless:focus {
        outline: none;
        color: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }
</style>
