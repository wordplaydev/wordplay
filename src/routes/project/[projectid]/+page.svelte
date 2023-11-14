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
    import { Projects, locales } from '@db/Database';
    import Page from '@components/app/Page.svelte';
    import Writing from '../../../components/app/Writing.svelte';

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading = false;
    let error = false;

    /** The project store is derived from the projects and the page's project ID. */
    let store: Writable<Project> | undefined = undefined;
    let project: Project | undefined = undefined;
    let editable = false;
    let overwritten = false;
    let unsub: Unsubscriber | undefined = undefined;
    $: if (store) setContext<ProjectContext>(ProjectSymbol, store);

    // Create a concept path for children
    setContext(ConceptPathSymbol, writable([]));

    // Whenever the page or projects change, update the project store.
    $: if ($page) {
        const projectID = decodeURI($page.params.projectid);
        // No matching project, but we have a project ID and we're in the browser?
        if (projectID && projectID.length > 0 && browser) {
            // Set loading feedback.
            loading = true;
            // Async load the project from the database.
            Projects.get(projectID)
                .then((proj) => {
                    // Remember the project
                    project = proj;
                    editable = false;
                    loading = false;
                    error = false;

                    // See if the project is editable, and if so, get it's store, so we can track it's changes.
                    const projectStore = Projects.getStore(projectID);
                    if (projectStore) {
                        editable = true;
                        if (store !== projectStore) {
                            // Unsubscribe from the previous store
                            if (unsub) unsub();
                            // Mark the project editable.
                            // Remember the new store
                            store = projectStore;
                            // Update the project we're showing whenever it changes.
                            unsub = store.subscribe((proj) => {
                                project = proj;
                                overwritten =
                                    Projects.getHistory(
                                        proj.getID()
                                    )?.wasOverwritten() ?? false;
                            });
                        }
                    }
                })
                .catch(() => {
                    error = true;
                });
        }
    }
</script>

<svelte:head>
    <title>{project ? project.getName() : '…'}</title>
</svelte:head>

{#if project}
    <Page>
        <!-- When the project ID changes, create a new project. -->
        {#key project.getID()}
            <ProjectView {project} {editable} {overwritten} warn={true} />
        {/key}
    </Page>
{:else if loading}
    <Loading />
{:else if $page.params.projectid || error}
    <Writing
        ><Feedback>{$locales.get((l) => l.ui.project.error.unknown)}</Feedback
        ></Writing
    >
{/if}
