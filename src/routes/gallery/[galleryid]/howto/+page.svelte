<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { Galleries, HowTos, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
    import HowToDrafts from './HowToDrafts.svelte';
    import HowToForm from './HowToForm.svelte';
    import HowToPreview from './HowToPreview.svelte';

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

    // determine if the user can add a new how-to
    const user = getUser();
    // TODO(@mc) -- i think this might be broken cuz firebase auth
    // let canUserEdit = $derived(
    //     gallery
    //         ? isAuthenticated($user) &&
    //               (gallery.hasCreator($user.uid) ||
    //                   gallery.hasCreator($user.uid))
    //         : false,
    // );
    let canUserEdit = true;

    // get the gallery name for display
    let galleryName = $derived(gallery?.getName($locales));

    // load the how tos for this gallery
    let howTos: HowTo[] = $state([]);

    function loadHowTos() {
        const galleryID = decodeURI(page.params.galleryid);
        HowTos.getHowTos(galleryID).then((hts) => {
            if (hts) howTos = hts;
            else howTos = [];
        });
    }

    $effect(() => {
        if (page.params.galleryid === undefined) {
            howTos = [];
            return;
        }

        loadHowTos();
    });

    // flag to indicate that a new how-to was added
    let addedNew: boolean = $state(false);

    $effect(() => {
        if (addedNew) {
            loadHowTos();
            addedNew = false;
        }
    });
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

        {#if canUserEdit}
            <HowToForm midpointX={50} midpointY={50} bind:addedNew />
        {/if}

        <HowToDrafts />
    </div>

    {#each howTos as howto, i (i)}
        <!-- {#if howto.getCoordinates()[0] >= currentViewLeft - 100 && howto.getCoordinates()[0] <= currentViewRight + 100 && howto.getCoordinates()[1] >= currentViewTop - 100 && howto.getCoordinates()[1] <= currentViewBottom + 100} -->
        <HowToPreview howToId={howto.getHowToId()} />
        <!-- {/if} -->
    {/each}
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
