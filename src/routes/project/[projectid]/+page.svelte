<script lang="ts">
    import {
        type ProjectContext,
        ProjectSymbol,
        getProjects,
    } from '@components/project/Contexts';
    import { writable, type Writable } from 'svelte/store';
    import { page } from '$app/stores';
    import ProjectView from '@components/project/ProjectView.svelte';
    import type Project from '@models/Project';
    import { preferredTranslations } from '@translation/translations';
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import { setContext } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';

    const projects = getProjects();

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading: boolean = false;
    let error: boolean = false;

    /** The project store is derived from the projects and the page's project ID. */
    const project: Writable<Project | undefined> = writable(undefined);
    setContext<ProjectContext>(ProjectSymbol, project);

    // Whenever the page or projects change, update the project store.
    $: {
        if ($page && $projects) {
            const projectID = $page.params.projectid;
            const proj = $projects.get(projectID);
            if (proj) project.set(proj);
            // No matching project, but we have a project ID and we're in the browser?
            else if (projectID && projectID.length > 0 && browser) {
                // Set loading feedback.
                loading = true;
                project.set(undefined);
                // Async load the project from the database.
                $projects
                    .load(projectID)
                    .then((loadedProject) => {
                        project.set(loadedProject);
                        loading = false;
                        error = false;
                    })
                    .catch(() => {
                        error = true;
                    });
            }
        } else {
            project.set(undefined);
        }
    }
</script>

<svelte:head>
    <title>{$project ? $project.name : '…'}</title>
</svelte:head>

{#if $project}
    {#key $project.id}
        <ProjectView
            project={$project}
            close={() => goto('/projects')}
            tip={$preferredTranslations[0].ui.tooltip.close}
        />
    {/key}
{:else if loading}
    <Loading />
{:else if $page.params.projectid || error}
    <Feedback>{$preferredTranslations[0].ui.feedback.unknownProject}</Feedback>
{/if}
