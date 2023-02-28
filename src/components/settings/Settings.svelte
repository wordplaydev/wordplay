<script lang="ts">
    import { preferredTranslations } from '@translation/translations';
    import Button from '../widgets/Button.svelte';
    import { animationsOn } from '../../models/stores';
    import LayoutChooser from './LayoutChooser.svelte';
    import LanguageChooser from './LanguageChooser.svelte';
</script>

<div class="settings">
    <Button
        tip={$preferredTranslations[0].ui.tooltip.animate}
        action={() => animationsOn.set(!$animationsOn)}
        >{#if $animationsOn}🏃‍♀️{:else}🧘🏽‍♀️{/if}</Button
    >
    <LayoutChooser />
    <LanguageChooser />
</div>

<style>
    .settings {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
