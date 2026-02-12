<script lang="ts">
    import { browser } from '$app/environment';
    import { page } from '$app/state';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Page from '@components/app/Page.svelte';
    import {
        getUser,
        isAuthenticated,
        setConceptPath,
        setProject,
    } from '@components/project/Contexts';
    import ProjectView from '@components/project/ProjectView.svelte';
    import { Galleries, Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { untrack } from 'svelte';
    import { writable } from 'svelte/store';
    import Writing from '../../../components/app/Writing.svelte';

    let user = getUser();

    /** True if we're async loading the project, as opposed to getting it from the browser cache. */
    let loading = $state(false);
    let error = $state(false);

    /** The project is set either by an effect on load or changes to the project history map in the database. **/
    let project: Project | undefined = $state(undefined);

    let projectID = $derived(
        page.params.projectid === undefined
            ? undefined
            : decodeURI(page.params.projectid),
    );

    // If the page params change, load the project explicitly, rather than waiting for the database to load it.
    $effect(() => {
        if (page && browser && projectID) {
            // Set loading feedback.
            loading = true;

            // We don't track this since we only want to depend on the page
            untrack(() => {
                // Async load the project from the database.
                Projects.get(projectID)
                    .then((proj) => {
                        // Remember that we're done loading and there's no error.
                        loading = false;
                        error = false;

                        // Update the project.
                        project = proj;
                    })
                    .catch(() => {
                        error = true;
                    });
            });
        }
    });

    // Whenever the project history changes, update the project. This relies
    // on Svelte 5's deep reactivity, as the history map and history state are reactive.

    let history = $derived(
        projectID ? Projects.getHistory(projectID) : undefined,
    );

    // When history's current value changes, update the project. This is super important: it enables feedback
    // after each edit of a project!
    $effect(() => {
        project = history?.getCurrent();
        if (history?.wasOverwritten()) {
            overwritten = true;
            // When overwritten, add the class, then remove it later.
            setTimeout(() => (overwritten = false), 1000);
        } else overwritten = false;
    });

    // The project is overwriten if we have a history for it and it says so.
    let overwritten = $state(false);

    // Check if the project is editable by the current user.
    let editable = $derived.by(() => {
        if (project === undefined) return false;
        const gallery = project.getGallery();
        return (
            // Locally editing
            (!isAuthenticated($user) && history !== undefined) ||
            // Logged in and a contributor or curator
            (isAuthenticated($user) &&
                history !== undefined &&
                (project.hasContributor($user.uid) ||
                    (gallery !== null &&
                        (Galleries.accessibleGalleries
                            .get(gallery)
                            ?.hasCurator($user.uid) ??
                            false))))
        );
    });

    // A project context store for children
    let projectContext = writable<Project | undefined>(undefined);
    setProject(projectContext);

    // When the project changes, set the project context fo children.
    $effect(() => {
        projectContext.set(project);
    });

    // Create a concept path for children
    setConceptPath(writable([]));

    // determine if the user is a commenter
    let isCommenter = $derived.by(() => {
        if (project === undefined) return false;
        else return isAuthenticated($user) && project.hasCommenter($user.uid);
    });
</script>

<svelte:head>
    <title>{project ? project.getName() : '…'}</title>
</svelte:head>

{#if project}
    <Page>
        <!-- When the project ID changes, create a fresh project view. -->
        {#key project.getID()}
            <ProjectView
                {project}
                {editable}
                {overwritten}
                warn={!editable}
                {isCommenter}
            />
        {/key}
    </Page>
{:else if loading}
    <Loading />
{:else if page.params.projectid || error}
    <Writing><Notice text={(l) => l.ui.project.error.unknown} /></Writing>
{/if}
