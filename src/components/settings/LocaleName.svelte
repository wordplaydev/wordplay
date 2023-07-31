<script lang="ts">
    import {
        getLocaleLanguageName,
        getLocaleRegionName,
    } from '../../locale/Locale';

    export let locale: string;
    export let supported: boolean;
</script>

<span class="language" class:supported
    >{getLocaleLanguageName(locale)}
    <sub>({getLocaleRegionName(locale)})</sub></span
>

<style>
    .language {
        transition-property: transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .language:not(.supported) {
        opacity: 0.6;
        cursor: default;
    }
</style>
