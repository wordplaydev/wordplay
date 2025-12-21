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

    // infinite canvas functionality
    let cameraX = $state(0);
    let cameraY = $state(0);
    let canvasMoving = $state(false);
    let childMoving = $state(false);

    function onMouseDown() {
        if (!childMoving) {
            canvasMoving = true;
        }
    }

    function onMouseMove(e: MouseEvent) {
        if (canvasMoving && !childMoving) {
            cameraX += e.movementX;
            cameraY += e.movementY;
        }
    }

    function onMouseUp() {
        if (!childMoving) {
            canvasMoving = false;
        }
    }
</script>

<Writing>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="infinitecanvas"
        onmousedown={onMouseDown}
        onmouseup={onMouseUp}
        onmousemove={onMouseMove}
    >
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
                <Subheader
                    text={(l) => l.ui.howto.canvasView.bookmarksheader}
                />

                <ul>
                    {#each bookmarks as howto, i (i)}
                        <li>{howto.getTitle()}</li>
                    {/each}
                </ul>
            </div>

            <div class="dottedarea" id="draftsarea">
                <Subheader text={(l) => l.ui.howto.canvasView.draftsheader} />
                <MarkupHTMLView
                    markup={(l) => l.ui.howto.canvasView.draftsprompt}
                />
                <!-- {#each drafts as howto, i (i)}
                    <HowToPreview howToId={howto.getHowToId()} />
                {/each} -->
            </div>
        </div>
        {#each published as howto, i (i)}
            <HowToPreview
                howToId={howto.getHowToId()}
                {cameraX}
                {cameraY}
                bind:childMoving
            />
        {/each}
    </div>
</Writing>

<style>
    .sticky-items {
        /* position: sticky;
        top: 0;
        left: 0; TODO(@mc) -- horizontal sticky not working */
        z-index: 100;
        padding-bottom: 1rem;
    }

    .dottedarea {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-style: dashed;
    }

    .infinitecanvas {
        position: fixed;
        top: 0;
        left: 0;
    }
</style>
