<script lang="ts">
    import type Locale from '@locale/Locale';
    import { DRAFT_SYMBOL } from '@parser/Symbols';
    import { withMonoEmoji } from '@unicode/emoji';
    import {
        getLocaleLanguages,
        getLocaleRegionNames,
        isLocaleDraft,
    } from '@locale/LocaleText';
    import { Languages } from '@locale/LanguageCode';

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
        getLocaleLanguages(locale).map(
            (code) => Languages[code]?.name ?? code,
        ),
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
    {#if draft && showDraft}
        {withMonoEmoji(DRAFT_SYMBOL)}&nbsp;
    {/if}{#each languageNames as name, index}{#if index > 0}<span
                class="join">{' + '}</span
            >{/if}<span class="name">{name}</span>{/each}{#each regions as region, index}<sub
            >{#if index > 0}
                /
            {/if}{region}</sub
        >{/each}
</span>

<style>
    .language {
        transition-property: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .language:not(:global(.supported)) {
        opacity: 0.6;
        cursor: default;
    }

    sub {
        font-size: xx-small;
    }
</style>
