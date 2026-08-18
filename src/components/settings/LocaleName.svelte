<script lang="ts">
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import type Locale from '@locale/Locale';
    import {
        getLocaleRegionNames,
        getMultilingualLanguageLabel,
        isLocaleDraft,
    } from '@locale/LocaleText';

    interface Props {
        locale: string | Locale;
        supported?: boolean;
        showDraft?: boolean;
    }

    let { locale, supported = true, showDraft = true }: Props = $props();

    
    let languageLabel = $derived(getMultilingualLanguageLabel(locale));
    let regions = $derived(
        typeof locale === 'string'
            ? getLocaleRegionNames(locale)
            : locale.regions,
    );
    let draft = $derived(
        typeof locale === 'string' ? isLocaleDraft(locale) : false,
    );
</script>

<span class="language" class:supported>
    <span class="names"
        >{languageLabel}
        {#if draft && showDraft}
            <MachineTranslatedAnnotation />{/if}</span
    >{#if regions.length > 0}<span class="regions"
            >{#each regions as region, index}{#if index > 0}/{/if}{region}{/each}</span
        >{/if}
</span>

<style>
    .language {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1;
        transition-property: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .language:not(:global(.supported)) {
        opacity: 0.6;
        cursor: default;
    }

    .regions {
        font-size: xx-small;
    }
</style>
