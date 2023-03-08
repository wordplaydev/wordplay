<script lang="ts">
    import {
        type ProjectContext,
        ProjectSymbol,
        getProjects,
    } from '@components/project/Contexts';
    import { derived, type Readable } from 'svelte/store';
    import { page } from '$app/stores';
    import ProjectView from '@components/project/ProjectView.svelte';
    import type Project from '@models/Project';
    import { preferredTranslations } from '@translation/translations';
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import { setContext } from 'svelte';

    const projects = getProjects();

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading: boolean = false;

    /** The project store is derived from the projects and the page's project ID. */
    const project: Readable<Project | undefined> = derived(
        [page, projects],
        ([$page, $projects]) => {
            const projectID = $page.params.projectid;
            const project = $projects.get(projectID);
            if (projectID === undefined) return undefined;
            else if (
                project === undefined &&
                projectID &&
                projectID.length > 0
            ) {
                loading = true;
                $projects.load(projectID);
            } else return project;
        }
    );

    setContext<ProjectContext>(ProjectSymbol, project);
</script>

<svelte:head>
    <title>{$project ? $project.name : '…'}</title>
</svelte:head>

{#if $project}
    <ProjectView project={$project} />
{:else if loading}
    <Loading />
{:else if $page.params.projectid}
    <Feedback>{$preferredTranslations[0].ui.feedback.unknownProject}</Feedback>
{/if}
