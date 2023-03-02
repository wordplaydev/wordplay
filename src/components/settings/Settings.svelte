<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import Button from '../widgets/Button.svelte';
    import { animationsOn, getAnimationDuration } from '@models/stores';
    import LayoutChooser from './LayoutChooser.svelte';
    import LanguageChooser from './LanguageChooser.svelte';
    import { slide } from 'svelte/transition';

    let expanded = false;
</script>

<div class="settings" class:expanded>
    {#if expanded}
        <div class="controls" transition:slide|local={getAnimationDuration()}>
            <Button
                tip={$preferredTranslations[0].ui.tooltip.animate}
                action={() => animationsOn.set(!$animationsOn)}
                >{#if $animationsOn}🏃‍♀️{:else}🧘🏽‍♀️{/if}</Button
            >
            <LayoutChooser />
            <LanguageChooser />
        </div>
    {/if}
    <Button
        tip={$preferredTranslations[0].ui.tooltip.settings}
        action={() => (expanded = !expanded)}
        ><div class="gear" class:expanded>⚙</div></Button
    >
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    :global(.animated) .gear {
        transition: transform 300ms ease-out;
    }

    .gear.expanded {
        display: inline-block;
        transform: rotate(270deg);
    }
</style>
