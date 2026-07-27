<script lang="ts">
    import { getLocalizing, getTip } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type { LocaleTextAccessor } from '@locale/Locales';

    interface Props {
        expanded: boolean;
        toggle: () => void;
        vertical?: boolean;
        label: LocaleTextAccessor;
        icons?: [string, string];
    }

    let { expanded, toggle, vertical = true, label, icons }: Props = $props();

    let view = $state<HTMLDivElement | undefined>(undefined);

    let hint = getTip();
    let localizing = getLocalizing();
    function showTip() {
        if (view) hint.showMarkup($locales.getMultilingualMarkup(label), view);
    }
    function hideTip() {
        hint.hide();
    }
</script>

<span class="expander-group"
    ><div
        role="button"
        class="expander {vertical ? 'vertical' : 'horizontal'}"
        class:expanded
        tabindex="0"
        aria-label={$locales.getPlainText(label)}
        onpointerdown={(event) => {
            if (event.button !== 0) return;
            event.stopPropagation();
            toggle();
        }}
        onkeydown={(event) =>
            event.key === ' ' || event.key === 'Enter' ? toggle() : undefined}
        onpointerenter={showTip}
        onpointerleave={hideTip}
        onfocus={showTip}
        onblur={hideTip}
        ontouchstart={showTip}
        ontouchend={hideTip}
        ontouchcancel={hideTip}
        bind:this={view}
        >{#if expanded}{icons ? icons[0] : '▲'}{:else}{icons
                ? icons[1]
                : '▼'}{/if}</div
    >{#if localizing?.on}<LocalizedText path={label} tipIcon />{/if}</span
>

<style>
    /* Anchors the localization tip badge to the expander's corner. */
    .expander-group {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        position: relative;
    }

    .expander {
        display: inline-block;
        cursor: pointer;
        color: var(--wordplay-inactive-color);
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
        user-select: none;
    }

    .expander.vertical {
        text-align: center;
    }

    .expander.horizontal {
        text-align: start;
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
