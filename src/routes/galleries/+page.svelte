<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
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

    /** Start the list of galleries with the example galleries. */
    let loadedGalleries: Gallery[] = $state([]);

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

    let galleries = $derived([
        ...Galleries.getExampleGalleries(),
        ...loadedGalleries,
    ]);
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.galleries.header)}</title>
</svelte:head>

<Writing>
    <Header text={(l) => l.ui.page.galleries.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.galleries.prompt} />

    {#if galleries === undefined}
        <Spinning large />
    {:else}
        <div class="previews">
            {#each galleries as gallery, index}
                <div class="preview">
                    <GalleryPreview {gallery} delay={index * 1000} />
                </div>
            {/each}
        </div>
    {/if}

    {#if lastBatch}
        <Button
            background
            tip={(l) => l.ui.page.galleries.button.more.tip}
            action={nextBatch}
            label={(l) => l.ui.page.galleries.button.more.label}
        />
    {/if}
</Writing>

<style>
    .previews {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 2em;
    }

    .preview {
        min-width: 40%;
    }
</style>
