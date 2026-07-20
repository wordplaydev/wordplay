<script lang="ts">
    import MachineTranslatedAnnotation from '@components/app/MachineTranslatedAnnotation.svelte';
    import { Languages } from '@locale/LanguageCode';
    import type Locale from '@locale/Locale';
    import {
        getLocaleLanguages,
        getLocaleRegionNames,
        isLocaleDraft,
    } from '@locale/LocaleText';

    interface Props {
        locale: string | Locale;
        supported?: boolean;
        showDraft?: boolean;
    }

    let { locale, supported = true, showDraft = true }: Props = $props();

    /** Each language in the tag (one entry for monolingual locales, two or
     *  more for multilingual ones). Used to render "[Spanish] + [English]"
     *  for mixed-language tags per the issue #430 UI tweak. */
    let languageNames = $derived(
        getLocaleLanguages(locale).map((code) => Languages[code]?.name ?? code),
    );
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
        >{#each languageNames as name, index}{#if index > 0}<span class="join"
                    >{' + '}</span
                >{/if}<span class="name">{name}</span>{/each}
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
