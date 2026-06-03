<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import Title from '@components/widgets/Title.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import {
        authAttempted,
        DB,
        Galleries,
        Projects,
        locales,
    } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { searchProjects, type ProjectMatch } from '../projects/search';
    import { debounced } from '@util/debounce.svelte';
    import {
        collection,
        getDocs,
        limit,
        orderBy,
        query,
        startAfter,
        where,
        type DocumentData,
        type QueryDocumentSnapshot,
    } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import { firestore } from '@db/firebase';
    import type { SerializedGallery } from '@db/galleries/Gallery';
    import Gallery, { upgradeGallery } from '@db/galleries/Gallery';
    import { GalleriesCollection } from '@db/galleries/GalleryDatabase.svelte';
    import { localeGoto } from '@util/localeGoto';

    let lastBatch = $state<QueryDocumentSnapshot<DocumentData> | undefined>(
        undefined,
    );

    let newGalleryError = $state(false);
    async function newGallery() {
        newGalleryError = false;
        try {
            const newGalleryID = await Galleries.create($locales);
            localeGoto(`/gallery/${newGalleryID}`);
        } catch (error) {
            console.error(error);
            newGalleryError = true;
        }
    }

    /** Start the list of galleries with the example galleries. */
    let loadedGalleries: Gallery[] = $state([]);

    const user = getUser();

    onMount(async () => {
        nextBatch();
    });

    async function nextBatch() {
        if (firestore === undefined) return firestore;
        const first = lastBatch
            ? query(
                  collection(firestore, GalleriesCollection),
                  where('public', '==', true),
                  orderBy('featured'),
                  orderBy('id'),
                  startAfter(lastBatch),
                  limit(5),
              )
            : query(
                  collection(firestore, GalleriesCollection),
                  where('public', '==', true),
                  orderBy('featured'),
                  orderBy('id'),
                  limit(5),
              );
        // Wrap in DB.read so a broken connection fails fast (rather than
        // hanging for minutes) and trips the site-wide connection banner.
        let documentSnapshots;
        try {
            documentSnapshots = await DB.read(getDocs(first));
        } catch (_) {
            // The banner (via DB.read) carries the message; leave the list as-is.
            return;
        }

        // Remember the last document.
        lastBatch = documentSnapshots.docs[documentSnapshots.docs.length - 1];

        // Convert the docs to galleries
        loadedGalleries = [
            ...(loadedGalleries ?? []),
            ...documentSnapshots.docs.map(
                (snap) =>
                    new Gallery(
                        upgradeGallery(snap.data() as SerializedGallery),
                    ),
            ),
        ];
    }

    let galleries = $derived([...loadedGalleries]);

    // Search functionality for example gallery projects. The input updates
    // `searchTerm` immediately (so loading can start promptly); the search runs
    // against a debounced copy.
    let searchTerm = $state('');
    const debouncedTerm = debounced(() => searchTerm);

    /** All example projects, loaded lazily when search is first used */
    let allExampleProjects: Project[] = $state([]);
    let loadingExamples = $state(false);

    $effect(() => {
        if (
            searchTerm.trim().length > 0 &&
            allExampleProjects.length === 0 &&
            !loadingExamples
        ) {
            loadingExamples = true;
            const ids = [
                ...new Set(
                    Galleries.getExampleGalleries().flatMap((g) =>
                        g.getProjects(),
                    ),
                ),
            ];
            Promise.all(ids.map((id) => Projects.get(id))).then((projects) => {
                allExampleProjects = projects.filter(
                    (p): p is Project => p !== undefined,
                );
                loadingExamples = false;
            });
        }
    });

    let searchResults: ProjectMatch[] = $derived(
        searchProjects(allExampleProjects, debouncedTerm.current, $locales),
    );
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.galleries.header} />
</svelte:head>

<Writing>
    <Header text={(l) => l.ui.page.galleries.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.galleries.prompt} />

    {#if $user}
        <Subheader text={(l) => l.ui.page.galleries.section.own.header} />
        <MarkupHTMLView
            markup={(l) => l.ui.page.galleries.section.own.explanation}
        />
        <p class="add">
            <Button
                tip={(l) => l.ui.page.galleries.button.newgallery}
                action={newGallery}
                icon="+"
                large
            ></Button></p
        >
        {#if newGalleryError}
            <Notice text={(l) => l.ui.page.projects.error.newgallery} />
        {/if}
        {#if (Galleries.getStatus() === 'loading' || Galleries.getStatus() === 'loggedout') && !Galleries.hydrated}
            <!-- Only block on the realtime query before the local cache has
                 hydrated. Once hydrated, render the user's cached galleries even
                 if the cloud query is still pending (e.g. offline), rather than
                 spinning forever.

                 We also treat 'loggedout' as "still loading" here: the gallery
                 listener is created once at startup (before auth), so it starts
                 'loggedout', and stays that way until startSync re-runs it for
                 this user. Since we're inside `{#if $user}` the user IS logged
                 in, so a 'loggedout' status is stale, not real — showing the
                 "you must be logged in" notice here flashes it spuriously. -->
            <Spinning label={(l) => l.ui.widget.loading.message} />
        {:else if Galleries.getStatus() === 'noaccess'}
            <Notice text={(l) => l.ui.page.projects.error.noaccess} />
        {:else}
            {#each Galleries.accessibleGalleries.values() as gallery}
                <GalleryPreview {gallery} />
            {/each}
        {/if}

        {#if Galleries.expandedScopeGalleries.size > 0}
            <Subheader
                text={(l) => l.ui.page.projects.subheader.howtoviewonly.header}
            />
            <MarkupHTMLView
                markup={(l) =>
                    l.ui.page.projects.subheader.howtoviewonly.explanation}
            />
            {#each Galleries.expandedScopeGalleries.values() as gallery}
                <div class="howtoonlypreview">
                    <Subheader>
                        <Link to={`/gallery/${gallery.getID()}/howto`}
                            >{gallery.getName($locales)}</Link
                        >
                    </Subheader>
                    <MarkupHTMLView
                        markup={gallery.getDescription($locales).length > 0
                            ? gallery.getDescription($locales)
                            : (l) => l.ui.gallery.undescribed}
                    /></div
                >
            {/each}
        {/if}
    {:else if $user === undefined || !$authAttempted}
        <!-- Auth hasn't resolved yet. Show an inline spinner so the "logged
             out" notice doesn't flash for users who turn out to be logged in.
             We gate on `authAttempted` (not just `$user === undefined`) because
             the auth listeners can briefly push a `null` before the restored
             user lands; until Firebase Auth has reported in at least once, a
             null is "still pending", not "logged out". Spinning (not Loading)
             because the header and prompt above are already rendered — same as
             /characters and /localize. -->
        <Spinning label={(l) => l.ui.widget.loading.message} />
    {:else}
        <Notice text={(l) => l.ui.page.galleries.error.nogalleryedits} />
    {/if}

    <Subheader text={(l) => l.ui.page.galleries.section.examples.header} />
    <MarkupHTMLView
        markup={(l) => l.ui.page.galleries.section.examples.explanation}
    />

    <TextField
        id="gallery-project-search"
        bind:text={searchTerm}
        placeholder="🔍"
        description={(l) => l.ui.page.galleries.search.description}
        max="10em"
    />

    {#if debouncedTerm.current.trim()}
        {#if loadingExamples}
            <Spinning label={(l) => l.ui.widget.loading.message} />
        {:else if searchResults.length === 0}
            <Notice text={(l) => l.ui.page.galleries.search.noResults} />
        {:else}
            <div class="search-results">
                {#each searchResults as { project, matchText } (project.getID())}
                    <ProjectPreview
                        {project}
                        searchTerm={debouncedTerm.current}
                        {...matchText !== undefined ? { matchText } : {}}
                        anonymize={false}
                    />
                {/each}
            </div>
        {/if}
    {:else}
        <div class="previews">
            {#each Galleries.getExampleGalleries() as gallery}
                <div class="preview">
                    <GalleryPreview {gallery} />
                </div>
            {/each}
        </div>
    {/if}

    <Subheader text={(l) => l.ui.page.galleries.section.public.header} />
    <MarkupHTMLView
        markup={(l) => l.ui.page.galleries.section.public.explanation}
    />

    {#if galleries === undefined}
        <Spinning size={2} />
    {:else}
        <div class="public">
            <div class="previews">
                {#each galleries as gallery}
                    <div class="preview">
                        <GalleryPreview {gallery} />
                    </div>
                {/each}
            </div>
            {#if lastBatch}
                <Button
                    background
                    tip={(l) => l.ui.page.galleries.button.more.tip}
                    action={nextBatch}
                    label={(l) => l.ui.page.galleries.button.more.label}
                />
            {/if}
        </div>
    {/if}
</Writing>

<style>
    .previews {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .public {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .preview {
        min-width: 40%;
    }

    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }

    .howtoonlypreview {
        gap: var(--wordplay-spacing);
    }

    .search-results {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: calc(2 * var(--wordplay-spacing));
    }
</style>
