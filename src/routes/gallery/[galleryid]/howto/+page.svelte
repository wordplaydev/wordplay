<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import { Galleries, HowTos, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
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
    let bookmarks: HowTo[] = $derived(
        $user
            ? howTos.filter((ht) =>
                  user ? ht.getBookmarkers().includes($user.uid) : false,
              )
            : [],
    );
    let published: HowTo[] = $derived(howTos.filter((ht) => ht.isPublished()));
    let drafts: HowTo[] = $derived(howTos.filter((ht) => !ht.isPublished()));

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

    // Drag and drop function referenced from: https://svelte.dev/playground/7d674cc78a3a44beb2c5a9381c7eb1a9?version=5.46.0
    // and https://svelte.dev/playground/f0823379afef4d249358cf969519c1b8?version=5.46.0
    function dropInCanvas(event: DragEvent) {
        event.preventDefault();

        // let draggedHowToID: string | undefined =
        //     event.dataTransfer?.getData('howto');

        // if (!draggedHowToID) return;

        // let howTo: HowTo | undefined = howTos.find(
        //     (ht) => ht.getHowToId() === draggedHowToID,
        // );

        // if (!howTo) return;

        // console.log(event);

        // HowTos.updateHowTo(
        //     new HowTo({
        //         ...howTo?.getData(),
        //         published: true,
        //         xcoord: event.clientX,
        //         ycoord: event.clientY,
        //     }),
        //     true,
        // );
    }
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
            <HowToForm bind:addedNew />
        {/if}

        <div class="dottedarea">
            <Subheader text={(l) => l.ui.howto.canvasView.bookmarksheader} />

            <ul>
                {#each bookmarks as howto, i (i)}
                    <li>{howto.getTitle()}</li>
                {/each}
            </ul>
        </div>

        <div class="dottedarea">
            <Subheader text={(l) => l.ui.howto.canvasView.draftsheader} />
            <MarkupHTMLView
                markup={(l) => l.ui.howto.canvasView.draftsprompt}
            />
            {#each drafts as howto, i (i)}
                <HowToPreview howToId={howto.getHowToId()} />
            {/each}
        </div>
    </div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        ondrop={(ev) => dropInCanvas(ev)}
        ondragover={(ev) => {
            ev.preventDefault();
        }}
        class="dottedarea"
    >
        {#each published as howto, i (i)}
            <!-- {#if howto.getCoordinates()[0] >= currentViewLeft - 100 && howto.getCoordinates()[0] <= currentViewRight + 100 && howto.getCoordinates()[1] >= currentViewTop - 100 && howto.getCoordinates()[1] <= currentViewBottom + 100} -->
            <HowToPreview howToId={howto.getHowToId()} />
            <!-- {/if} -->
        {/each}
    </div>
</Writing>

<style>
    .sticky-items {
        position: sticky;
        top: 0;
        left: 0; /* TODO(@mc) -- horizontal sticky not working */
        z-index: 100;
        padding-bottom: 1rem;
    }

    .dottedarea {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-style: dashed;
    }
</style>
