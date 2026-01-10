<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Page from '@components/app/Page.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getAnnounce,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Options, { type Option } from '@components/widgets/Options.svelte';
    import { Galleries, HowTos, locales } from '@db/Database';
    import type Gallery from '@db/galleries/Gallery';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { docToMarkup } from '@locale/LocaleText';
    import { untrack } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import HowToConfiguration from './HowToConfiguration.svelte';
    import HowToForm from './HowToForm.svelte';
    import HowToPreview from './HowToPreview.svelte';

    // The current gallery being viewed. Starts at null, to represent loading state.
    let gallery = $state<Gallery | null | undefined>(null);
    const galleryID: string | undefined = page.params.galleryid
        ? decodeURI(page.params.galleryid)
        : undefined;

    // When the page changes, get the gallery store corresponding to the requested ID.
    $effect(() => {
        if (galleryID === undefined) {
            gallery = undefined;
            return;
        }
        Galleries.get(galleryID).then((gal) => {
            // Found a store? Subscribe to it, updating the gallery when it changes.
            if (gal) gallery = gal;
            // Not found? No gallery.
            else gallery = undefined;
        });
    });

    let galleryName = $derived(gallery?.getName($locales));
    const user = getUser();

    // get the how-tos in the gallery
    // if the user is logged in, HowTos.listen() got called by syncUser, which populates HowTos.galleryHowTos in the callback
    // if not, we we will make a one-time query to get the how-tos
    // we don't want to render any how-tos that aren't in the canvas area
    let howTos: HowTo[] = $state([]);
    let canvasWidth: number = $state(0);
    let canvasHeight: number = $state(0);

    $effect(() => {
        if (galleryID === undefined) {
            return;
        }

        HowTos.galleryHowTos.get(galleryID); // this gets updated by the listener

        HowTos.getHowTos(galleryID).then((data) => {
            if (data) howTos = data;
        });
    });

    // determine if the user can add a new how-to
    let canUserEdit = $derived(
        gallery
            ? isAuthenticated($user) &&
                  (gallery.hasCurator($user.uid) ||
                      gallery.hasCreator($user.uid))
            : false,
    );

    let isUserCurator = $derived(
        gallery && $user && gallery.hasCurator($user.uid),
    );

    let usersBookmarks: HowTo[] = $derived(
        howTos.filter((hs) => $user && hs.hasBookmarker($user.uid)),
    );

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

    // when cameraX and cameraY change, announce it
    const announce = getAnnounce();

    $effect(() => {
        cameraX;
        cameraY;

        untrack(() => {
            if ($announce) {
                $announce(
                    'canvas moved',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize(
                            $locales.get((l) => l.ui.howto.announcePosition),
                            'canvas',
                            cameraX.toString(),
                            cameraY.toString(),
                        )
                        .toText(),
                );
            }
        });
    });

    // navigation via dropdown and url params

    // allow for the URL to take you to a specific how-to
    let urlID: string | null = $derived(page.url.searchParams.get('id'));
    $effect(() => {
        if (urlID) {
            let queried: HowTo = howTos.filter(
                (ht) => ht.getHowToId() === urlID,
            )[0];
            if (queried) {
                let coords = queried.getCoordinates();
                panTo(coords[0], coords[1]);
            }
        }
    });

    // data for the dropdown
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
    let notPermittedAreas = $state<
        SvelteMap<string, [number, number, number, number]>
    >(new SvelteMap());
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
                            $locales.get((l) => l.ui.howto.header),
                        ).concretize($locales, [galleryName]) ?? ''}
                    />
                </Header>

                {#if canUserEdit}
                    <HowToForm
                        editingMode={true}
                        howTo={undefined}
                        bind:cameraX
                        bind:cameraY
                        {notPermittedAreas}
                    />
                {/if}

                <Options
                    bind:value={navigationSelection}
                    label={(l) => l.ui.howto.navigationtooltip}
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

                {#if isUserCurator}
                    <HowToConfiguration {gallery} />
                {/if}
            </div>
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="howtospacebody">
                <div class="stickyarea" id="drafts">
                    {#if canUserEdit}
                        <div class="drafts">
                            <Subheader text={(l) => l.ui.howto.drafts.header} />
                            <MarkupHTMLView
                                markup={(l) => l.ui.howto.drafts.prompt}
                            />
                            <div class="draftslist">
                                <ul>
                                    {#each howTos as howTo, i (i)}
                                        {#if !howTo.isPublished()}
                                            <li>
                                                <HowToForm
                                                    editingMode={false}
                                                    bind:howTo={howTos[i]}
                                                    {notPermittedAreas}
                                                    {cameraX}
                                                    {cameraY}
                                                />
                                            </li>
                                        {/if}
                                    {/each}
                                </ul>
                            </div>
                        </div>
                    {/if}
                    <div class="bookmarks">
                        <Subheader text={(l) => l.ui.howto.bookmarks.header} />
                        {#each usersBookmarks as bookmark, i (i)}
                            <Button
                                tip={(l) => l.ui.howto.bookmarks.tooltip}
                                label={(l) => bookmark.getTitle()}
                                action={() => {
                                    let coords = bookmark.getCoordinates();
                                    panTo(coords[0], coords[1]);
                                }}
                            />
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
                    bind:clientWidth={canvasWidth}
                    bind:clientHeight={canvasHeight}
                >
                    {#each howTos as howTo, i (i)}
                        {#if howTo.isPublished() && howTo.inCanvasArea(-cameraX, -cameraX + canvasWidth, -cameraY, -cameraY + canvasHeight)}
                            <HowToPreview
                                bind:howTo={howTos[i]}
                                {cameraX}
                                {cameraY}
                                bind:childMoving
                                bind:notPermittedAreas
                                galleryCuratorCollaborators={gallery
                                    .getCurators()
                                    .concat(gallery.getCreators())}
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
        width: 100%;
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

    /* .stickyarea {
        display: grid;
        grid-template-rows: 1fr 1fr;
    } */

    .drafts {
        border: var(--wordplay-border-color) dashed;
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
    }

    .draftslist {
        height: 100%;
        overflow-y: auto;
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

    .canvas:active {
        border-color: var(--wordplay-highlight-color);
        border-width: var(--wordplay-focus-width);
    }
</style>
