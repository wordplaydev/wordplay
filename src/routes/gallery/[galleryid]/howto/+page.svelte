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
    const galleryID = decodeURI(page.params.galleryid);
    let galleryName = $derived(gallery?.getName($locales));

    // load the how tos for this gallery
    let howTos = $state<HowTo[]>([]);

    $effect(() => {
        if (galleryID === undefined) {
            howTos = [];
            return;
        }

        HowTos.getHowTos(galleryID).then((hts) => {
            if (hts) howTos = hts;
            else howTos = [];
        });
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

    function onKeyDown(event: KeyboardEvent) {
        if (!childMoving) {
            switch (event.key) {
                case 'ArrowUp':
                    cameraY += 10;
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    cameraY -= 10;
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    cameraX += 10;
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    cameraX -= 10;
                    event.preventDefault();
                    break;
                default:
                    return;
            }
            return;
        }
    }

    let draftsArea: DOMRect | undefined = $derived(
        document.getElementById('draftsarea')?.getBoundingClientRect(),
    );

    let viewportWidth = $derived(window.innerWidth);
    let viewportHeight = $derived(window.innerHeight);

    function panTo(x: number, y: number) {
        let viewportCenterX: number = viewportWidth / 2;
        let viewportCenterY: number =
            (draftsArea && viewportHeight / 2 > draftsArea.bottom + 100) || // TODO(@mc) -- fix magic number
            !draftsArea
                ? viewportHeight / 2 + 100
                : draftsArea.bottom + 100;

        cameraX = -x + viewportCenterX;
        cameraY = -y + viewportCenterY;
    }

    panTo(0, 0);

    // determine if we should render a how-to based on its coordinates
    // needs to be within the viewport as well as outside of the drafts / bookmarks areas
    function shouldRender(coordinates: number[]): boolean {
        const x = coordinates[0] + cameraX;
        const y = coordinates[1] + cameraY;
        const BUFFER = 0;

        let inBounds: boolean =
            x >= -BUFFER &&
            x <= viewportWidth + BUFFER &&
            y >= -BUFFER &&
            y <= viewportHeight + BUFFER;

        let infoArea: DOMRect | undefined = document
            .getElementById('info')
            ?.getBoundingClientRect();
        let inStickies: boolean =
            infoArea !== undefined &&
            x >= infoArea.left - BUFFER &&
            x <= infoArea.right + BUFFER &&
            y >= infoArea.top - BUFFER &&
            y <= infoArea.bottom + BUFFER;

        return inBounds && !inStickies;
    }

    // if a specific how-to was requested, pan to it and open its dialog
    // const requestedId: string | null = page.url.searchParams.get('id');

    // if (requestedId) {
    //     $effect(() => {
    //         const requestedHowTo = howTos.find(
    //             (ht) => ht.getHowToId() === requestedId,
    //         );
    //         if (requestedHowTo) {
    //             let coords = requestedHowTo.getCoordinates();
    //             panTo(coords[0], coords[1]);
    //         }
    //     });
    // }

    let newHowTo: HowTo | undefined = $state(undefined);

    $effect(() => {
        if (newHowTo) {
            newHowTo = undefined;
            HowTos.getHowTos(galleryID).then((hts) => {
                if (hts) howTos = hts;
                else howTos = [];
            });
        }
    });
</script>

<Writing>
    <div id="info">
        <Header>
            <MarkupHTMLView
                inline
                markup={docToMarkup(
                    $locales.get((l) => l.ui.howto.canvasView.header),
                ).concretize($locales, [galleryName]) ?? ''}
            />
        </Header>

        {#if canUserEdit}
            <HowToForm editingMode={true} bind:howTo={newHowTo} />
        {/if}

        <div class="canvasstickyarea">
            <div class="drafts" id="draftsarea">
                <Subheader text={(l) => l.ui.howto.canvasView.draftsheader} />
                <MarkupHTMLView
                    markup={(l) => l.ui.howto.canvasView.draftsprompt}
                />
                {#each howTos as howTo, i (i)}
                    {#if !howTo.isPublished()}
                        <HowToPreview
                            bind:howTo={howTos[i]}
                            {cameraX}
                            {cameraY}
                            bind:childMoving
                            {draftsArea}
                        />
                    {/if}
                {/each}
            </div>

            <div class="bookmarks" id="bookmarksarea">
                <Subheader
                    text={(l) => l.ui.howto.canvasView.bookmarksheader}
                />

                {#each howTos as howto, i (i)}
                    {#if howto.getBookmarkers().includes($user?.uid ?? '')}
                        <Button
                            tip={(l) => l.ui.howto.canvasView.bookmarkstooltip}
                            label={(l) => howto.getTitle()}
                            action={() => {
                                let coords = howto.getCoordinates();
                                console.log(howto.getTitle(), 'is at', coords);
                                panTo(coords[0], coords[1]);
                            }}
                        />
                    {/if}
                {/each}
            </div>
        </div>
    </div>
    {#each howTos as howTo, i (i)}
        {#if howTo.isPublished() && shouldRender(howTo.getCoordinates())}
            <HowToPreview
                bind:howTo={howTos[i]}
                {cameraX}
                {cameraY}
                bind:childMoving
                {draftsArea}
            />
        {/if}
    {/each}
</Writing>
<svelte:window
    onmouseup={onMouseUp}
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onkeydown={(event) => onKeyDown(event)}
    ondblclick={() => panTo(0, 0)}
/>

<style>
    .drafts {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-style: dashed;
        cursor: default;
        height: auto;
        width: 100%;
        padding: var(--wordplay-spacing);
    }

    .bookmarks {
        border: var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        border-style: dashed;
        cursor: default;
        height: auto;
        width: 100%;
        padding: var(--wordplay-spacing);
    }

    .canvasstickyarea {
        display: grid;
        grid-template-columns: 1fr 1fr;
        padding: var(--wordplay-spacing);
    }
</style>
