<script>
    import ProjectChooser from '@components/app/ProjectChooser.svelte';
    import Page from '@components/app/Page.svelte';
    import { creator } from '@db/Creator';
</script>

<svelte:head>
    <title>{$creator.getLocale().ui.headers.projects}</title>
</svelte:head>

<Page>
    <ProjectChooser />
</Page>
