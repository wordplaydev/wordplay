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
    import { browser } from '$app/environment';

    const projects = getProjects();

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading: boolean = false;
    let error: boolean = false;

    /** The project store is derived from the projects and the page's project ID. */
    const project: Readable<Project | undefined> = derived(
        [page, projects],
        ([$page, $projects]) => {
            const projectID = $page.params.projectid;
            const project = $projects.get(projectID);

            if (project) return project;

            // No matching project, but we have a project ID and we're in the browser?
            if (projectID && projectID.length > 0 && browser) {
                // Set loading feedback.
                loading = true;
                // Async load the project from the database.
                $projects
                    .load(projectID)
                    .then(() => {
                        loading = false;
                        error = false;
                    })
                    .catch(() => {
                        loading = false;
                        error = true;
                    });
            }
            return undefined;
        }
    );

    setContext<ProjectContext>(ProjectSymbol, project);
</script>

<svelte:head>
    <title>{$project ? $project.name : '…'}</title>
</svelte:head>

{#if $project}
    {#key $project.id}
        <ProjectView project={$project} />
    {/key}
{:else if loading}
    <Loading />
{:else if $page.params.projectid || error}
    <Feedback>{$preferredTranslations[0].ui.feedback.unknownProject}</Feedback>
{/if}
