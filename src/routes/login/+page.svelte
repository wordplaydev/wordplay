<script>
    import TextField from '@components/widgets/TextField.svelte';
    import { preferredTranslations } from '@translation/translations';
</script>

<TextField placeholder={$preferredTranslations[0].ui.placeholders.email} />
