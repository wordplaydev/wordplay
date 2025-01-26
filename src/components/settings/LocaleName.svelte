<script lang="ts">
    import { DRAFT_SYMBOL } from '@parser/Symbols';
    import {
        getLocaleLanguageName,
        getLocaleRegionName,
        isLocaleDraft,
    } from '../../locale/LocaleText';
    import { withColorEmoji } from '../../unicode/emoji';

    interface Props {
        locale: string;
        supported: boolean;
    }

    let { locale, supported }: Props = $props();

    let region = $derived(getLocaleRegionName(locale));
    let draft = $derived(isLocaleDraft(locale));
</script>

<span class="language" class:supported>
    {#if draft}{withColorEmoji(DRAFT_SYMBOL)}{/if}
    <span class="name">{getLocaleLanguageName(locale)}</span>
    {#if region}<sub>{region}</sub>{/if}
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
