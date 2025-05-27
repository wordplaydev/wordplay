<script lang="ts">
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        expanded: boolean;
        toggle: () => void;
        vertical?: boolean;
        label: LocaleTextAccessor;
    }

    let { expanded, toggle, vertical = true, label }: Props = $props();
</script>

<div
    role="button"
    class="expander {vertical ? 'vertical' : 'horizontal'}"
    class:expanded
    tabindex="0"
    title={$locales.get(label)}
    aria-label={$locales.get(label)}
    onpointerdown={(event) => {
        event.stopPropagation();
        toggle();
    }}
    onkeydown={(event) =>
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
