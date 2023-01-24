<svelte:options immutable={true} />

<script lang="ts">
    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
</script>

<button
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
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-font-size);
        font-weight: var(--wordplay-font-weight);
        transition: transform 0.25s;
        transform-origin: center;
        user-select: none;
        border: none;
        background: none;
        padding: 0;
        margin: calc(var(--wordplay-spacing) / 2);
        color: currentcolor;
        cursor: pointer;
    }

    button:disabled {
        cursor: default;
        background: none;
        color: var(--wordplay-disabled-color);
    }

    button:hover:not(:disabled) {
        border: none;
        color: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    button:focus,
    button:hover {
        transform: scale(1.3);
        outline: none;
        color: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }
</style>
