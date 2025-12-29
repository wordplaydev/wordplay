<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Page from '@components/app/Page.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import { Galleries, HowTos, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import type HowTo from '@db/howtos/HowToDatabase.svelte';
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

    let galleryID = $derived(gallery?.getID());
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
    let canUserEdit = $user !== null;

    // refresh the page when a new howTo is created
    let newHowTo: HowTo | undefined = $state(undefined);

    $effect(() => {
        if (newHowTo && galleryID) {
            newHowTo = undefined;
            HowTos.getHowTos(galleryID).then((hts) => {
                if (hts) howTos = hts;
                else howTos = [];
            });
        }
    });

    // infinite canvas functionality
    let cameraX = $state(0);
    let cameraY = $state(0);

    function panTo(x: number, y: number) {
        cameraX = -x + 10;
        cameraY = -y + 10;
    }

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

    let touchPrevX: number | undefined = $state(undefined);
    let touchPrevY: number | undefined = $state(undefined);
    function onTouchStart(event: TouchEvent) {
        if (!childMoving) {
            canvasMoving = true;
            touchPrevX = event.touches[0].clientX;
            touchPrevY = event.touches[0].clientY;
        }
    }

    function onTouchMove(event: TouchEvent) {
        if (canvasMoving && !childMoving) {
            let touchX = event.touches[0].clientX;
            let touchY = event.touches[0].clientY;

            if (touchPrevX !== undefined && touchPrevY !== undefined) {
                let deltaX = touchX - touchPrevX;
                let deltaY = touchY - touchPrevY;

                cameraX += deltaX;
                cameraY += deltaY;
            }

            touchPrevX = touchX;
            touchPrevY = touchY;
        }
    }

    function onTouchEnd() {
        if (!childMoving) {
            canvasMoving = false;
            touchPrevX = undefined;
            touchPrevY = undefined;
        }
    }

    // navigation
    let navigationSelection: string | undefined = $state(undefined);
    let navigationOptions: Option[] = $derived([
        { value: undefined, label: '—' },
        ...howTos
            .filter((ht) => ht.isPublished())
            .map((h) => {
                return {
                    value: h.getHowToId(),
                    label: h.getTitle(),
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label)),
    ]);

    // collision detection
    let notPermittedAreasCanvas = $state<
        Map<string, [number, number, number, number]>
    >(new Map());
    let notPermittedAreasDrafts = $state<
        Map<string, [number, number, number, number]>
    >(new Map());
</script>

{#if gallery === null}
    <Loading />
{:else if gallery === undefined}
    <Writing>
        <Notice text={(l) => l.ui.howto.error.unknown} />
    </Writing>
{:else}
    <Page footer={true}>
        <div class="howtospace">
            <div class="howtospaceheader">
                <Header>
                    <MarkupHTMLView
                        inline
                        markup={docToMarkup(
                            $locales.get((l) => l.ui.howto.canvasView.header),
                        ).concretize($locales, [galleryName]) ?? ''}
                    />
                </Header>

                {#if canUserEdit}
                    <HowToForm
                        editingMode={true}
                        bind:howTo={newHowTo}
                        {cameraX}
                        {cameraY}
                        {notPermittedAreasCanvas}
                        {notPermittedAreasDrafts}
                    />
                {/if}

                <Options
                    bind:value={navigationSelection}
                    label={(l) => l.ui.howto.canvasView.navigationtooltip}
                    options={navigationOptions}
                    change={() => {
                        let navigateTo: HowTo | undefined = howTos.find(
                            (ht) => ht.getHowToId() == navigationSelection,
                        );

                        if (!navigateTo) return;

                        let coords = navigateTo.getCoordinates();
                        panTo(coords[0], coords[1]);
                    }}
                ></Options>
            </div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="howtospacebody">
                <div class="stickyarea" id="drafts">
                    {#if canUserEdit}
                        <div class="drafts">
                            <Subheader
                                text={(l) => l.ui.howto.canvasView.draftsheader}
                            />
                            <MarkupHTMLView
                                markup={(l) =>
                                    l.ui.howto.canvasView.draftsprompt}
                            />
                            <div class="draftslist">
                                {#each howTos as howTo, i (i)}
                                    {#if !howTo.isPublished()}
                                        <HowToPreview
                                            bind:howTo={howTos[i]}
                                            {cameraX}
                                            {cameraY}
                                            bind:childMoving
                                            bind:notPermittedAreas={
                                                notPermittedAreasDrafts
                                            }
                                        />
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {/if}
                    <div class="bookmarks">
                        <Subheader
                            text={(l) => l.ui.howto.canvasView.bookmarksheader}
                        />

                        {#each howTos as howto, i (i)}
                            {#if howto
                                .getBookmarkers()
                                .includes($user?.uid ?? '')}
                                <Button
                                    tip={(l) =>
                                        l.ui.howto.canvasView.bookmarkstooltip}
                                    label={(l) => howto.getTitle()}
                                    action={() => {
                                        let coords = howto.getCoordinates();
                                        panTo(coords[0], coords[1]);
                                    }}
                                />
                            {/if}
                        {/each}
                    </div>
                </div>
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div
                    class="canvas"
                    id="canvas"
                    onmouseup={onMouseUp}
                    onmousedown={onMouseDown}
                    onmousemove={onMouseMove}
                    onkeydown={(event) => onKeyDown(event)}
                    ontouchstart={(event) => onTouchStart(event)}
                    ontouchend={onTouchEnd}
                    ontouchmove={(event) => onTouchMove(event)}
                    ondblclick={() => panTo(0, 0)}
                    tabindex="0"
                >
                    {#each howTos as howTo, i (i)}
                        {#if howTo.isPublished()}
                            <HowToPreview
                                bind:howTo={howTos[i]}
                                {cameraX}
                                {cameraY}
                                bind:childMoving
                                bind:notPermittedAreas={notPermittedAreasCanvas}
                            />
                        {/if}
                    {/each}
                </div>
            </div>
        </div>
    </Page>
{/if}

<style>
    .howtospace {
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100%;
    }

    .howtospaceheader {
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }

    .howtospacebody {
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        display: grid;
        grid-template-columns: 1fr 3fr;
    }

    .stickyarea {
        display: grid;
        grid-template-rows: 1fr auto;
    }

    .drafts {
        border: var(--wordplay-border-color) dashed;
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        display: grid;
        grid-template-rows: auto 1fr 1fr;
    }

    .draftslist {
        position: relative;
    }

    .bookmarks {
        border: var(--wordplay-border-color) dashed;
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        margin-top: var(--wordplay-spacing);
    }

    .canvas {
        border: var(--wordplay-border-color) solid;
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        overflow: hidden;
        position: relative;
    }

    .drafts:active,
    .canvas:active {
        border-color: var(--wordplay-highlight-color);
        border-width: var(--wordplay-focus-width);
    }
</style>
