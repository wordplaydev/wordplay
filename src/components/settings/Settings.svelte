<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import Button from '../widgets/Button.svelte';
    import { animationsOn } from '@models/stores';
    import LayoutChooser from './LayoutChooser.svelte';
    import LanguageChooser from './LanguageChooser.svelte';

    let expanded = false;
</script>

<div class="settings" class:expanded>
    {#if expanded}
        <Button
            tip={$preferredTranslations[0].ui.tooltip.animate}
            action={() => animationsOn.set(!$animationsOn)}
            >{#if $animationsOn}🏃‍♀️{:else}🧘🏽‍♀️{/if}</Button
        >
        <LayoutChooser />
        <LanguageChooser />
    {/if}
    <Button
        tip={$preferredTranslations[0].ui.tooltip.settings}
        action={() => (expanded = !expanded)}>⚙</Button
    >
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
