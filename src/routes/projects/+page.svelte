<script>
    import ProjectChooser from '@components/app/ProjectChooser.svelte';
    import Page from '@components/app/Page.svelte';
    import { preferredLocales } from '@translation/locales';
</script>

<svelte:head>
    <title>{$preferredLocales[0].ui.headers.projects}</title>
</svelte:head>

<Page>
    <ProjectChooser />
</Page>
