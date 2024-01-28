<svelte:options immutable={true} />

<script context="module" lang="ts">
    export type ActionReturn = void | boolean | undefined;
    export type Action = () => Promise<ActionReturn> | ActionReturn;
</script>

<script lang="ts">
    import Spinning from '../app/Spinning.svelte';

    export let tip: string;
    export let action: Action;
    export let active = true;
    export let stretch = false;
    export let submit = false;
    export let uiid: string | undefined = undefined;
    export let classes: string | undefined = undefined;
    export let scale = true;
    export let view: HTMLButtonElement | undefined = undefined;
    export let large = false;
    export let background = false;

    let loading = false;

    async function doAction(event: Event) {
        if (active) {
            const result = action();
            if (result instanceof Promise) {
                loading = true;
                result.finally(() => (loading = false));
            }
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
    on:click|stopPropagation={loading
        ? null
        : (event) =>
              event.button === 0 && active ? doAction(event) : undefined}
    on:keydown={loading
        ? null
        : (event) =>
              (event.key === 'Enter' || event.key === ' ') &&
              // Only activate with no modifiers down. Enter is used for other shortcuts.
              !event.shiftKey &&
              !event.ctrlKey &&
              !event.altKey &&
              !event.metaKey
                  ? doAction(event)
                  : undefined}
    >{#if loading}<Spinning />{:else}<slot />{/if}
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
        min-width: 1em;
        width: fit-content;
        height: fit-content;
        white-space: nowrap;
        transition: transform calc(var(--animation-factor) * 200ms);
        /* This allows command hints to be visible */
        position: relative;
        overflow: visible;
        /* Don't let it shrink smaller than its width */
        flex-shrink: 0;
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

    button:hover[aria-disabled='false'] {
        transform: rotate(-3deg);
    }

    button.background:hover[aria-disabled='false'] {
        background: var(--wordplay-chrome);
        border-color: var(--wordplay-alternating-color);
    }

    button:active[aria-disabled='false'] {
        transform: scale(0.8);
    }
</style>
