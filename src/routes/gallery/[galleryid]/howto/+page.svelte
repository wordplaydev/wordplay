<script lang="ts">
    import { page } from '$app/state';
    import Header from '@components/app/Header.svelte';
    import Link from '@components/app/Link.svelte';
    import Loading from '@components/app/Loading.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Page from '@components/app/Page.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getAnnouncer,
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

    // The component views
    let howToComponents = $state<HowToPreview[]>([]);

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
    let howTos: HowTo[] = $state([]);

    $effect(() => {
        if (gallery)
            HowTos.getHowTos(gallery.getHowTos()).then((data) => {
                if (data) howTos = data;
            });
    });

    // used for calculating if we should render the how-to
    let canvasWidth: number = $state(0);
    let canvasHeight: number = $state(0);

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
        howTos.filter(
            (hs) => $user && hs.hasBookmarker($user.uid) && hs.isPublished(),
        ),
    );

    // infinite canvas functionality
    let cameraX = $state(0);
    let cameraY = $state(0);

    function panTo(x: number, y: number) {
        cameraX = -x + 10;
        cameraY = -y + 10;
    }

    // tracks which item is moving
    // if undefined, nothing is moving. if "canvas," then canvas is moving.
    // if how-to id, then that how-to is moving
    let whichMoving: string | undefined = $state(undefined);

    // doesn't allow how-tos to move while a dialog is open
    let whichDialogOpen: string | undefined = $state(undefined);

    function onpointerdown() {
        if (whichDialogOpen) return;

        whichMoving = 'canvas';
    }

    function onpointerup() {
        if (whichMoving !== 'canvas' || whichDialogOpen) return;
        whichMoving = undefined;
    }

    function onpointermove(e: PointerEvent) {
        if (whichMoving !== 'canvas' || whichDialogOpen) return;

        cameraX += e.movementX;
        cameraY += e.movementY;
    }

    let keyboardFocused: boolean = $state(false);
    function onfocus() {
        if (whichDialogOpen) return;

        keyboardFocused = true;
    }

    function onblur() {
        if (whichDialogOpen) return;

        keyboardFocused = false;

        if (whichMoving === 'canvas') whichMoving = undefined;
    }

    // if navigating using a keyboard, the canvas is put in "move mode" when arrow keys are used
    function onkeydown(event: KeyboardEvent) {
        if (
            keyboardFocused &&
            (whichMoving === undefined || whichMoving === 'canvas') &&
            !whichDialogOpen
        ) {
            switch (event.key) {
                case 'ArrowUp':
                    cameraY += 10;
                    whichMoving = 'canvas';
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    cameraY -= 10;
                    whichMoving = 'canvas';
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    cameraX += 10;
                    whichMoving = 'canvas';
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    cameraX -= 10;
                    whichMoving = 'canvas';
                    event.preventDefault();
                    break;
                default:
                    return;
            }
        }
    }

    const announce = getAnnouncer();

    // announce when move mode changes
    $effect(() => {
        untrack(() => {
            if ($announce) {
                if (whichMoving === 'canvas') {
                    $announce(
                        'canvas move mode activated',
                        $locales.getLanguages()[0],
                        $locales
                            .concretize(
                                $locales.get(
                                    (l) => l.ui.howto.announce.moveActivated,
                                ),
                                'canvas',
                            )
                            .toText(),
                    );
                } else if (whichMoving !== undefined) {
                    let movingHowTo = howTos.find(
                        (ht) => ht.getHowToId() === whichMoving,
                    );

                    if (movingHowTo)
                        $announce(
                            'how-to move mode activated',
                            $locales.getLanguages()[0],
                            $locales
                                .concretize(
                                    $locales.get(
                                        (l) =>
                                            l.ui.howto.announce.moveActivated,
                                    ),
                                    movingHowTo.getTitle(),
                                )
                                .toText(),
                        );
                } else {
                    $announce(
                        'move mode deactivated',
                        $locales.getLanguages()[0],
                        $locales.get(
                            (l) => l.ui.howto.announce.moveDeactivated,
                        ),
                    );
                }
            }
        });
    });

    // when cameraX and cameraY change, announce it
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
                            $locales.get(
                                (l) => l.ui.howto.announce.canvasPosition,
                            ),
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
                (ht) => ht.getHowToId() === urlID && ht.isPublished(),
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
                    label: h.getTitleInLocale($locales.getLocaleString()),
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
                <Header text={(l) => l.ui.howto.galleryView.header}></Header>
                <Subheader>
                    {#if ($user && (gallery.hasCurator($user.uid) || gallery.hasCreator($user.uid))) || gallery.isPublic()}
                        <Link
                            to="/gallery/{galleryID}"
                            tip={(l) => l.ui.howto.headerTooltip}
                            >{galleryName}</Link
                        >
                    {:else}
                        {galleryName}
                    {/if}
                </Subheader>

                <MarkupHTMLView markup={(l) => l.ui.howto.galleryView.prompt} />

                <div class="howtospacetoolbar">
                    {#if canUserEdit}
                        <HowToForm
                            editingMode={true}
                            howTo={undefined}
                            bind:cameraX
                            bind:cameraY
                            {notPermittedAreas}
                            bind:whichDialogOpen
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

                            navigationSelection = undefined;
                        }}
                    ></Options>

                    <Button
                        tip={(l) => l.ui.howto.button.reset.tip}
                        label={(l) => l.ui.howto.button.reset.label}
                        icon="🎯"
                        action={() => {
                            panTo(0, 0);
                        }}
                    ></Button>

                    {#if isUserCurator}
                        <HowToConfiguration {gallery} />
                    {/if}
                </div>
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
                                    {#each howTos as _, i (i)}
                                        {#if !howTos[i].isPublished()}
                                            <li>
                                                <HowToForm
                                                    editingMode={false}
                                                    bind:howTo={howTos[i]}
                                                    {notPermittedAreas}
                                                    {cameraX}
                                                    {cameraY}
                                                    bind:whichDialogOpen
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
                        {#if $user}
                            {#each usersBookmarks as bookmark, i (i)}
                                <Button
                                    tip={(l) => l.ui.howto.bookmarks.tooltip}
                                    label={(l) => bookmark.getTitle()}
                                    action={() => {
                                        // Center the bookmarked how to
                                        let coords = bookmark.getCoordinates();
                                        panTo(coords[0], coords[1]);

                                        // Find the corresponding view and show it's preview.
                                        let index = howTos.findIndex(
                                            (ht) =>
                                                ht.getHowToId() ===
                                                bookmark.getHowToId(),
                                        );
                                        if (index !== -1)
                                            howToComponents[
                                                index
                                            ].showPreview();
                                    }}
                                />
                            {:else}
                                <MarkupHTMLView
                                    markup={(l) => l.ui.howto.bookmarks.empty}
                                />
                            {/each}
                        {:else}
                            <MarkupHTMLView
                                markup={docToMarkup(
                                    $locales.get(
                                        (l) => l.ui.howto.bookmarks.notLoggedIn,
                                    ),
                                )}
                            />
                        {/if}
                    </div>
                </div>
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div
                    class="canvas"
                    id="canvas"
                    ondblclick={() => panTo(0, 0)}
                    tabindex="0"
                    bind:clientWidth={canvasWidth}
                    bind:clientHeight={canvasHeight}
                    style:border-color={whichMoving === 'canvas'
                        ? 'var(--wordplay-highlight-color)'
                        : 'var(--wordplay-border-color)'}
                    style:border-width={whichMoving === 'canvas'
                        ? 'var(--wordplay-focus-width)'
                        : ''}
                    {onpointerdown}
                    {onpointerup}
                    {onpointermove}
                    {onfocus}
                    {onblur}
                    {onkeydown}
                >
                    {#each howTos as howTo, i (i)}
                        {#if howTo.isPublished() && howTo.inCanvasArea(-cameraX, -cameraX + canvasWidth, -cameraY, -cameraY + canvasHeight)}
                            <HowToPreview
                                bind:howTo={howTos[i]}
                                bind:this={howToComponents[i]}
                                {cameraX}
                                {cameraY}
                                bind:whichMoving
                                bind:notPermittedAreas
                                galleryCuratorCollaborators={gallery
                                    .getCurators()
                                    .concat(gallery.getCreators())}
                                bind:whichDialogOpen
                            />
                        {/if}
                    {/each}
                </div>
            </div>
        </div>
    </Page>
{/if}
<svelte:window onblur={onpointerup} />

<style>
    .howtospace {
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100%;
        width: 100%;
        padding: var(--wordplay-spacing);
    }

    .howtospaceheader {
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }

    .howtospacetoolbar {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
    }

    .howtospacebody {
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        display: grid;
        grid-template-columns: 1fr 3fr;
    }

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
        border: solid;
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        overflow: hidden;
        position: relative;
        touch-action: none;
    }
</style>
