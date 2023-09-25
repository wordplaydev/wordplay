<svelte:options immutable={true} />

<script lang="ts">
    export let tip: string;
    export let action: () => void;
    export let active = true;
    export let stretch = false;
    export let submit = false;
    export let uiid: string | undefined = undefined;
    export let classes: string | undefined = undefined;
    export let scale = true;
    export let view: HTMLButtonElement | undefined = undefined;
    export let large = false;
    export let background = false;

    async function doAction(event: Event) {
        if (active) {
            action();
            event?.stopPropagation();
        }
    }
</script>

<!-- Note that we don't make the button inactive using "disabled" because that makes
    it invisible to screen readers. -->
<button
    class:stretch
    class:background
    class:scale
    class:large
    data-uiid={uiid}
    class={classes}
    type={submit ? 'submit' : 'button'}
    title={tip}
    aria-label={tip}
    aria-disabled={!active}
    bind:this={view}
    on:dblclick|stopPropagation
    on:pointerdown={(event) =>
        event.button === 0 && active ? doAction(event) : undefined}
    on:keydown={(event) =>
        (event.key === 'Enter' || event.key === ' ') &&
        // Only activate with no modifiers down. Enter is used for other shortcuts.
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
            ? doAction(event)
            : undefined}
>
    <slot />
</button>

<style>
    button {
        background-color: var(--wordplay-chrome);
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        font-weight: var(--wordplay-font-weight);
        font-style: inherit;
        transform-origin: center;
        user-select: none;
        border: none;
        padding: 0;
        background: none;
        color: currentcolor;
        cursor: pointer;
        width: fit-content;
        height: fit-content;
        /* Needs to be clickable */
        min-width: 1em;
        white-space: nowrap;
        transition: transform calc(var(--animation-factor) * 200ms);
    }

    button.stretch {
        width: inherit;
        height: inherit;
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }

    button:focus {
        background: var(--wordplay-focus-color);
        border-radius: var(--wordplay-border-radius);
        color: var(--wordplay-background);
        fill: var(--wordplay-background);
    }

    button:hover:not(:focus)[aria-disabled='false'] {
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
    }

    button.scale:focus[aria-disabled='false'],
    button.scale:hover[aria-disabled='false'] {
        transform: scale(1.1);
    }

    :global(button:focus .token-view) {
        border-radius: var(--wordplay-border-radius);
        color: var(--wordplay-background);
    }

    .large {
        font-size: 24pt;
    }

    .background {
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .background[aria-disabled='true'] {
        border-color: transparent;
    }

    button.background:hover[aria-disabled='false'] {
        transform: rotate(-2deg);
        background: var(--wordplay-chrome);
        border-color: var(--wordplay-alternating-color);
    }
</style>
