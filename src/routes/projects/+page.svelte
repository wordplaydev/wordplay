<script>
    import ProjectChooser from '@components/app/ProjectChooser.svelte';
    import Page from '@components/app/Page.svelte';
    import { config } from '@db/Database';
</script>

<svelte:head>
    <title>{$config.getLocale().ui.header.projects}</title>
</svelte:head>

<Page>
    <ProjectChooser />
</Page>
