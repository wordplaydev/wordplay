<script lang="ts">
    import type Locale from '@locale/Locale';
    import { DRAFT_SYMBOL } from '@parser/Symbols';
    import { withColorEmoji } from '@unicode/emoji';
    import {
        getLocaleLanguageName,
        getLocaleRegionNames,
        isLocaleDraft,
    } from '../../locale/LocaleText';

    interface Props {
        locale: string | Locale;
        supported?: boolean;
        showDraft?: boolean;
    }

    let { locale, supported = true, showDraft = true }: Props = $props();

    let language = $derived(getLocaleLanguageName(locale));
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
    <span class="name">{language}</span>{#each regions as region, index}<sub
            >{#if index > 0}
                /
            {/if}{region}</sub
        >{/each}
    {#if draft && showDraft}
        {withColorEmoji(DRAFT_SYMBOL)}{/if}
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
