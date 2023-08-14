<script>
    import ProjectChooser from '@components/app/ProjectChooser.svelte';
    import Page from '@components/app/Page.svelte';
    import { locale } from '@db/Database';
</script>

<svelte:head>
    <title>{$locale.ui.header.projects}</title>
</svelte:head>

<Page>
    <ProjectChooser />
</Page>
