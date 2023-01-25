<script lang="ts">
    import { getLanguageName } from '@translation/LanguageCode';
    import { missingTranslations } from '@translation/translations';
</script>

{#each $missingTranslations as missing}
    <p>
        <em>Wordplay no habla <strike>{getLanguageName(missing)}</strike></em>
    </p>
{/each}
