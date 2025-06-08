<script lang="ts">
    import { DRAFT_SYMBOL } from '@parser/Symbols';
    import {
        getLocaleLanguageName,
        getLocaleRegionNames,
        isLocaleDraft,
    } from '../../locale/LocaleText';
    import { withColorEmoji } from '../../unicode/emoji';

    interface Props {
        locale: string;
        supported: boolean;
        showDraft?: boolean;
    }

    let { locale, supported, showDraft = true }: Props = $props();

    let regions = $derived(getLocaleRegionNames(locale));
    let draft = $derived(isLocaleDraft(locale));
</script>

<span class="language" class:supported>
    {#if draft && showDraft}{withColorEmoji(DRAFT_SYMBOL)}{/if}
    <span class="name">{getLocaleLanguageName(locale)}</span
    >{#each regions as region, index}<sub
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
