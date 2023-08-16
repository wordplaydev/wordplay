<script lang="ts">
    import {
        type ProjectContext,
        ProjectSymbol,
        ConceptPathSymbol,
    } from '@components/project/Contexts';
    import { writable, type Unsubscriber, type Writable } from 'svelte/store';
    import { page } from '$app/stores';
    import ProjectView from '@components/project/ProjectView.svelte';
    import type Project from '@models/Project';
    import Feedback from '@components/app/Feedback.svelte';
    import Loading from '@components/app/Loading.svelte';
    import { setContext } from 'svelte';
    import { browser } from '$app/environment';
    import { database, locale } from '@db/Database';
    import Page from '@components/app/Page.svelte';

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading = false;
    let error = false;

    /** The project store is derived from the projects and the page's project ID. */
    let projectStore: Writable<Project> | undefined = undefined;
    let project: Project | undefined = undefined;
    let unsub: Unsubscriber | undefined = undefined;
    $: if (projectStore)
        setContext<ProjectContext>(ProjectSymbol, projectStore);

    // Create a concept path for children
    setContext(ConceptPathSymbol, writable([]));

    // Whenever the page or projects change, update the project store.
    $: if ($page) {
        const projectID = $page.params.projectid;
        // No matching project, but we have a project ID and we're in the browser?
        if (projectID && projectID.length > 0 && browser) {
            // Set loading feedback.
            loading = true;
            // Async load the project from the database.
            database
                .getProject(projectID)
                .then(() => {
                    const store = database.getProjectStore(projectID);
                    if (store && store !== projectStore) {
                        if (unsub) unsub();
                        projectStore = store;
                        unsub = store.subscribe((proj) => (project = proj));
                        loading = false;
                        error = false;
                    }
                })
                .catch(() => {
                    error = true;
                });
        }
    }
</script>

<svelte:head>
    <title>{project ? project.name : '…'}</title>
</svelte:head>

{#if project}
    <Page
        fullscreen={database.getProjectLayout(project.id)?.isFullscreen() ??
            false}
    >
        {#key project.id}
            <ProjectView {project} />
        {/key}
    </Page>
{:else if loading}
    <Loading />
{:else if $page.params.projectid || error}
    <Feedback>{$locale.ui.feedback.unknownProject}</Feedback>
{/if}
