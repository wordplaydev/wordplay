<script lang="ts">
    import { getLanguageName } from '@locale/LanguageCode';
    import { config } from '../../db/Creator';
</script>

{#each $config.getMissingLanguages() as missing}
    <p>
        <em>Wordplay no habla <strike>{getLanguageName(missing)}</strike></em>
    </p>
{/each}
