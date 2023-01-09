<script lang="ts">
    import { getLanguageName } from '../translations/LanguageCode';
    import { missingTranslations } from '../translations/translations';
</script>

{#each $missingTranslations as missing}
    <p>
        <em>Wordplay no habla <strike>{getLanguageName(missing)}</strike></em>
    </p>
{/each}
