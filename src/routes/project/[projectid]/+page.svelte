<script lang="ts">
    import { project } from '@models/stores';
    import ProjectView from '@components/project/ProjectView.svelte';
</script>

{#if $project}
    <ProjectView project={$project} />
{/if}
