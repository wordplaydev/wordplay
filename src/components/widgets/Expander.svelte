<script lang="ts">
    export let expanded: boolean;
    export let toggle: () => void;
    export let vertical = true;
</script>

<div
    role="button"
    class="expander {vertical ? 'vertical' : 'horizontal'}"
    class:expanded
    tabindex="0"
    on:pointerdown|stopPropagation={toggle}
    on:keydown={(event) =>
        event.key === ' ' || event.key === 'Enter' ? toggle() : undefined}
    >{#if expanded}▲{:else}▼{/if}</div
>

<style>
    .expander {
        display: inline-block;
        cursor: pointer;
        color: var(--wordplay-inactive-color);
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .expander.vertical {
        text-align: center;
    }

    .expander.horizontal {
        text-align: left;
        transform-origin: center;
        transform: rotate(90deg);
    }

    .expander:focus {
        color: var(--wordplay-focus-color);
        outline: none;
    }

    .expander:hover {
        color: var(--wordplay-highlight-color);
    }
</style>
