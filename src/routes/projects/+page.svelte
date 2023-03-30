<script>
    import ProjectChooser from '@components/app/ProjectChooser.svelte';
    import Page from '@components/app/Page.svelte';
    import { preferredTranslations } from '@translation/translations';
</script>

<svelte:head>
    <title>{$preferredTranslations[0].ui.headers.projects}</title>
</svelte:head>

<Page>
    <ProjectChooser />
</Page>
