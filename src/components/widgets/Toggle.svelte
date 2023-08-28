<svelte:options immutable={true} />

<script lang="ts">
    import type { ToggleText } from '../../locale/UITexts';

    export let tips: ToggleText;
    export let on: boolean;
    export let toggle: () => void;
    export let active = true;
    export let uiid: string | undefined = undefined;

    async function doToggle(event: Event) {
        if (active) {
            toggle();
            event?.stopPropagation();
        }
    }
</script>

<!-- Note that we don't make the button inactive using "disabled" because that makes
    it invisible to screen readers. -->
<button
    type="button"
    data-uiid={uiid}
    class:on
    title={on ? tips.on : tips.off}
    aria-disabled={!active}
    aria-pressed={on}
    on:dblclick|stopPropagation
    on:pointerdown={(event) =>
        event.button === 0 && active ? doToggle(event) : undefined}
    on:keydown={(event) =>
        (event.key === 'Enter' || event.key === ' ') &&
        // Only activate with no modifiers down. Enter is used for other shortcuts.
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
            ? doToggle(event)
            : undefined}
>
    <slot />
</button>

<style>
    button {
        font-family: var(--wordplay-app-font);
        font-size: inherit;
        font-weight: var(--wordplay-font-weight);
        font-style: inherit;
        transform-origin: center;
        user-select: none;
        border: none;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        cursor: pointer;
        width: fit-content;
        white-space: nowrap;
        transition: transform calc(var(--animation-factor) * 200ms);
        border-radius: var(--wordplay-border-radius);
    }

    button.on {
        background-color: var(--wordplay-alternating-color);
        box-shadow: inset 0px 1px var(--wordplay-chrome);
        transform: scale(0.9);
    }

    button:hover {
        background-color: var(--wordplay-alternating-color);
    }

    [aria-disabled='true'] {
        cursor: default;
        background: none;
        color: var(--wordplay-inactive-color);
    }
</style>
