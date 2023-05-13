<script lang="ts">
    import { getLanguageName } from '@locale/LanguageCode';
    import { creator } from '../../db/Creator';
</script>

{#each $creator.getMissingLanguages() as missing}
    <p>
        <em>Wordplay no habla <strike>{getLanguageName(missing)}</strike></em>
    </p>
{/each}
