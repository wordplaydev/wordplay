<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
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
    let shouldRefreshHowTos: boolean = $state(false);

    $effect(() => {
        if (shouldRefreshHowTos) {
            loadHowTos();
            shouldRefreshHowTos = false;
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

    function panTo(x: number, y: number) {
        // logic isn't quite right here -- need to center the thing that is being panned to
        cameraX = x;
        cameraY = y;
    }

    let draftsArea: DOMRect | undefined = $derived(
        document.getElementById('draftsarea')?.getBoundingClientRect(),
    );

    let viewportWidth = $derived(window.innerWidth);
    let viewportHeight = $derived(window.innerHeight - 100);

    // determine if we should render a how-to based on its coordinates (viewport + some buffer)
    function shouldRender(coordinates: number[]): boolean {
        const x = coordinates[0] + cameraX;
        const y = coordinates[1] + cameraY;
        const BUFFER = 0;

        return (
            x >= -BUFFER &&
            x <= viewportWidth + BUFFER &&
            y >= -BUFFER &&
            y <= viewportHeight + BUFFER
        );
    }
</script>

<Writing>
    <Header>
        <MarkupHTMLView
            inline
            markup={docToMarkup(
                $locales.get((l) => l.ui.howto.canvasView.header),
            ).concretize($locales, [galleryName]) ?? ''}
        />
    </Header>

    {#if canUserEdit}
        <HowToForm bind:addedNew={shouldRefreshHowTos} />
    {/if}

    <div class="canvasstickyarea">
        <div class="dottedarea" id="draftsarea">
            <Subheader text={(l) => l.ui.howto.canvasView.draftsheader} />
            <MarkupHTMLView
                markup={(l) => l.ui.howto.canvasView.draftsprompt}
            />
            {#each drafts as howto, i (i)}
                <!-- draft previews should not move when the infinite canvas is moved, so set camera vars to 0 -->
                <HowToPreview
                    howToId={howto.getHowToId()}
                    {cameraX}
                    {cameraY}
                    bind:childMoving
                    {draftsArea}
                    bind:changedLocation={shouldRefreshHowTos}
                />
            {/each}
        </div>

        <div class="dottedarea" id="bookmarksarea">
            <Subheader text={(l) => l.ui.howto.canvasView.bookmarksheader} />

            {#each bookmarks as howto, i (i)}
                <Button
                    tip={(l) => l.ui.howto.canvasView.bookmarkstooltip}
                    label={(l) => howto.getTitle()}
                    action={() => {
                        let howToCoords = howto.getCoordinates();
                        panTo(howToCoords[0], howToCoords[0]);
                    }}
                />
            {/each}
        </div>
    </div>
    {#each published as howto, i (i)}
        {#if shouldRender(howto.getCoordinates())}
            <HowToPreview
                howToId={howto.getHowToId()}
                {cameraX}
                {cameraY}
                bind:childMoving
                bind:changedLocation={shouldRefreshHowTos}
            />
        {/if}
    {/each}
</Writing>
<svelte:window
    onmouseup={onMouseUp}
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
/>

<style>
    .dottedarea {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-style: dashed;
        cursor: default;
        height: auto;
    }

    .canvasstickyarea {
        display: grid;
        grid-template-columns: 3fr 1fr;
    }
</style>
