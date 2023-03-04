<script>
    import TextField from '@components/widgets/TextField.svelte';
    import Page from '@components/app/Page.svelte';
    import { preferredTranslations } from '@translation/translations';
</script>

<Page>
    <TextField placeholder={$preferredTranslations[0].ui.placeholders.email} />
</Page>
