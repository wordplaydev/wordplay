<script lang="ts">
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
    import { Galleries, locales } from '@db/Database';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import { onMount } from 'svelte';
    import {
        collection,
        getDocs,
        limit,
        orderBy,
        query,
        where,
        type DocumentData,
        type QueryDocumentSnapshot,
        startAfter,
    } from 'firebase/firestore';
    import { firestore } from '../../db/firebase';
    import type { SerializedGallery } from '../../models/Gallery';
    import Gallery, { upgradeGallery } from '../../models/Gallery';
    import GalleryPreview from '../../components/app/GalleryPreview.svelte';
    import Spinning from '../../components/app/Spinning.svelte';
    import Button from '../../components/widgets/Button.svelte';
    import { GalleriesCollection } from '../../db/GalleryDatabase';

    let lastBatch: QueryDocumentSnapshot<DocumentData>;

    const examples = Galleries.exampleGalleries;

    /** Start the list of galleries with the example galleries. */
    let loadedGalleries: Gallery[] = [];

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
                  limit(5)
              )
            : query(
                  collection(firestore, GalleriesCollection),
                  where('public', '==', true),
                  orderBy('featured'),
                  orderBy('id'),
                  limit(5)
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
                        upgradeGallery(snap.data() as SerializedGallery)
                    )
            ),
        ];
    }

    $: galleries = [...$examples, ...loadedGalleries];
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.galleries.header)}</title>
</svelte:head>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.galleries.header)}</Header>
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.galleries.prompt)} />

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
        <Button background tip="more" action={nextBatch}>more!</Button>
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
