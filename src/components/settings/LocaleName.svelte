<script lang="ts">
    import {
        getLocaleLanguageName,
        getLocaleRegionName,
    } from '../../locale/LocaleText';

    interface Props {
        locale: string;
        supported: boolean;
    }

    let { locale, supported }: Props = $props();

    let region = $derived(getLocaleRegionName(locale));
</script>

<span class="language" class:supported
    ><span class="name">{getLocaleLanguageName(locale)}</span>{#if region}<sub
            >{region}</sub
        >{/if}</span
>

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
