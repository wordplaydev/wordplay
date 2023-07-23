<svelte:options immutable={true} />

<script lang="ts">
    export let tip: string;
    export let action: () => void;
    export let enabled: boolean = true;
    export let stretch: boolean = false;
    export let submit: boolean = false;
    export let uiid: string | undefined = undefined;
    export let classes: string | undefined = undefined;
    export let scale: boolean = true;
    export let view: HTMLButtonElement | undefined = undefined;

    async function doAction() {
        action();
    }
</script>

<!-- Note that we don't make the button inactive using "disabled" because that makes
    it invisible to screen readers. -->
<button
    class:stretch
    data-uiid={uiid}
    class={classes}
    class:scale
    type={submit ? 'submit' : null}
    title={tip}
    aria-label={tip}
    tabindex={enabled ? 0 : null}
    bind:this={view}
    on:dblclick|stopPropagation
    on:pointerdown|stopPropagation={() => (enabled ? doAction() : undefined)}
    on:keydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? doAction() : undefined}
    aria-disabled={!enabled}
>
    <slot />
</button>

<style>
    button {
        display: inline-flex;
        background-color: var(--wordplay-chrome);
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        font-weight: var(--wordplay-font-weight);
        transform-origin: center;
        user-select: none;
        border: none;
        background: none;
        padding: 0;
        color: currentcolor;
        cursor: pointer;
        width: fit-content;
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
        outline: none;
        color: var(--wordplay-highlight);
        fill: var(--wordplay-highlight);
    }

    button.scale:focus[aria-disabled='false'],
    button.scale:hover[aria-disabled='false'] {
        transform: scale(1.1);
    }
</style>
