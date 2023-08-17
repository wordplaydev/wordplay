<script>
    import ProjectChooser from '@components/app/ProjectChooser.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { locale } from '@db/Database';
</script>

<svelte:head>
    <title>{$locale.ui.header.projects}</title>
</svelte:head>

<Writing>
    <ProjectChooser />
</Writing>
