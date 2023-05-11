<script lang="ts">
    import { getLanguageName } from '@translation/LanguageCode';
    import { missingLocales } from '@translation/locales';
</script>

{#each $missingLocales as missing}
    <p>
        <em>Wordplay no habla <strike>{getLanguageName(missing)}</strike></em>
    </p>
{/each}
