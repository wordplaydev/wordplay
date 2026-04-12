<script lang="ts">
    import { goto } from '$app/navigation';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import ProjectPreview from '@components/app/ProjectPreview.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import Title from '@components/widgets/Title.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { Galleries, Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Fuse from 'fuse.js';
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
    import GalleryPreview from '../../components/app/GalleryPreview.svelte';
    import Spinning from '../../components/app/Spinning.svelte';
    import MarkupHTMLView from '../../components/concepts/MarkupHTMLView.svelte';
    import Button from '../../components/widgets/Button.svelte';
    import { firestore } from '../../db/firebase';
    import type { SerializedGallery } from '../../db/galleries/Gallery';
    import Gallery, { upgradeGallery } from '../../db/galleries/Gallery';
    import { GalleriesCollection } from '../../db/galleries/GalleryDatabase.svelte';

    let lastBatch = $state<QueryDocumentSnapshot<DocumentData> | undefined>(
        undefined,
    );

    let newGalleryError = $state(false);
    async function newGallery() {
        newGalleryError = false;
        try {
            const newGalleryID = await Galleries.create($locales);
            goto(`/gallery/${newGalleryID}`);
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
        const documentSnapshots = await getDocs(first);

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

    // Search functionality for example gallery projects
    let searchTerm = $state('');

    const fuseOptions = {
        includeScore: true,
        threshold: 0.4,
        ignoreLocation: true,
        keys: ['name'],
    };

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

    let searchResults = $derived.by((): Project[] => {
        if (!searchTerm.trim()) return [];
        const searchable = allExampleProjects.map((p) => ({
            project: p,
            name: p.getName(),
        }));
        const fuse = new Fuse(searchable, fuseOptions);
        return fuse.search(searchTerm).map((r) => r.item.project);
    });
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
        {#if Galleries.getStatus() === 'loading'}
            <Spinning label={(l) => l.ui.widget.loading.message} />
        {:else if Galleries.getStatus() === 'noaccess'}
            <Notice text={(l) => l.ui.page.projects.error.noaccess} />
        {:else if Galleries.getStatus() === 'loggedout'}
            <Notice text={(l) => l.ui.page.galleries.error.nogalleryedits} />
        {:else}
            {#each Galleries.accessibleGalleries.values() as gallery, index}
                <GalleryPreview {gallery} delay={index * 1000} />
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

    {#if searchTerm.trim()}
        {#if loadingExamples}
            <Spinning label={(l) => l.ui.widget.loading.message} />
        {:else if searchResults.length === 0}
            <Notice text={(l) => l.ui.page.galleries.search.noResults} />
        {:else}
            <div class="search-results">
                {#each searchResults as project (project.getID())}
                    <ProjectPreview
                        {project}
                        {searchTerm}
                        anonymize={false}
                    />
                {/each}
            </div>
        {/if}
    {:else}
        <div class="previews">
            {#each Galleries.getExampleGalleries() as gallery, index}
                <div class="preview">
                    <GalleryPreview {gallery} delay={index * 250} />
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
                {#each galleries as gallery, index}
                    <div class="preview">
                        <GalleryPreview {gallery} delay={index * 250} />
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
