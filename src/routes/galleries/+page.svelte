<script lang="ts">
    import { goto } from '$app/navigation';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { getUser } from '@components/project/Contexts';
    import Title from '@components/widgets/Title.svelte';
    import { Galleries, locales } from '@db/Database';
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
                            : `/${$locales.get((l) => l.ui.gallery.undescribed)}/`}
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

    <div class="previews">
        {#each Galleries.getExampleGalleries() as gallery, index}
            <div class="preview">
                <GalleryPreview {gallery} delay={index * 250} />
            </div>
        {/each}
    </div>

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
</style>
