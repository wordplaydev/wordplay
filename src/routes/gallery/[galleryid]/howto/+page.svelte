<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { Galleries, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import { docToMarkup } from '@locale/LocaleText';
    import HowToCanvas from './HowToCanvas.svelte';
    import HowToDrafts from './HowToDrafts.svelte';
    import HowToForm from './HowToForm.svelte';

    const user = getUser();

    // The current gallery being viewed. Starts at null, to represent loading state.
    let gallery = $state<Gallery | null | undefined>(null);

    // When the page changes, get the gallery store corresponding to the requested ID.
    $effect(() => {
        if (page.params.galleryid === undefined) {
            gallery = undefined;
            return;
        }
        const galleryID = decodeURI(page.params.galleryid);
        Galleries.get(galleryID).then((gal) => {
            // Found a store? Subscribe to it, updating the gallery when it changes.
            if (gal) gallery = gal;
            // Not found? No gallery.
            else gallery = undefined;
        });
    });

    let galleryName = $derived(gallery?.getName($locales));
</script>

<Writing>
    <div class="sticky-items">
        <Header>
            <MarkupHTMLView
                inline
                markup={docToMarkup(
                    $locales.get((l) => l.ui.howto.canvasView.header),
                ).concretize($locales, [galleryName]) ?? ''}
            />
        </Header>

        <HowToForm midpointX={50} midpointY={50} />

        <HowToDrafts />
    </div>

    <HowToCanvas currentViewLeft={0} currentViewTop={0} />
</Writing>

<style>
    .sticky-items {
        position: sticky;
        top: 0;
        left: 0; /* TODO(@mc) -- horizontal sticky not working */
        z-index: 100;
        padding-bottom: 1rem;
    }
</style>
