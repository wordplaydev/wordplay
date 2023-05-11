<script lang="ts">
    import { getLanguageName } from '@locale/LanguageCode';
    import { missingLocales } from '@locale/locales';
</script>

{#each $missingLocales as missing}
    <p>
        <em>Wordplay no habla <strike>{getLanguageName(missing)}</strike></em>
    </p>
{/each}
