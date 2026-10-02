<script lang="ts">
    import type { AppPath } from '#util/appPath.ts';
    import Link from '#components/app/Link.svelte';
    import Notice from '#components/app/Notice.svelte';
    import { getUser } from '#components/project/Contexts.ts';
    import Button from '#components/widgets/Button.svelte';
    import LocalizedText from '#components/widgets/LocalizedText.svelte';
    import Options, { type Option } from '#components/widgets/Options.svelte';
    import { disconnected, Galleries, HowTos, locales } from '#db/Database.ts';
    import type Gallery from '#db/galleries/Gallery.ts';
    import type HowTo from '#db/howtos/HowToDatabase.svelte.ts';
    import {
        canUnrepostHowTo,
        repostDestinations,
    } from '#db/howtos/howToAccess.ts';
    import { repostHowTo, unrepostHowTo } from '#db/howtos/howToReposts.ts';
    import { CANCEL_SYMBOL } from '#parser/Symbols.ts';
    import { findHowToPlacement, type Rect } from './HowToMovement';

    /**
     * Where else a how-to is shared (#1065): the galleries it was reposted into,
     * a way to share it into another, and, when it is being read outside its
     * home, which gallery it belongs to. A repost is the same how-to, not a
     * copy, so everything else on the page is shared with it.
     */
    interface Props {
        howTo: HowTo;
        /** The gallery whose space this is being viewed in. */
        here: Gallery | undefined;
        /** Its home gallery, which may be unreadable to someone reading a repost. */
        home: Gallery | undefined;
    }

    let { howTo, here, home }: Props = $props();

    const user = getUser();

    /** Pending while a callable runs, so a second press can't send it twice. */
    let busy = $state(false);
    let failed = $state(false);
    let destination: string | undefined = $state(undefined);

    let reposts = $derived(
        howTo
            .getReposts()
            .map((id) => Galleries.getKnown(id))
            .filter((gallery): gallery is Gallery => gallery !== undefined),
    );

    let destinations: Option[] = $derived([
        { value: undefined, label: '—' },
        ...repostDestinations(
            howTo,
            home,
            Galleries.accessibleGalleries.values(),
            $user?.uid,
        ).map((gallery) => ({
            value: gallery.getID(),
            label: gallery.getName($locales),
        })),
    ]);

    let isRepostHere = $derived(
        here !== undefined && here.getID() !== howTo.getHowToGalleryId(),
    );

    /** Somewhere free in the destination's space, found as a new how-to's is. */
    function placeIn(galleryID: string): [number, number] {
        const taken = new Map<string, Rect>(
            HowTos.howTosInGallery(galleryID)
                .filter((other) => other.isPublished())
                .map((other) => {
                    const [x, y] = other.getCoordinates(galleryID);
                    return [other.getHowToId(), [x, y, 120, 120]];
                }),
        );
        return findHowToPlacement(taken, 0, 0, 120, 120);
    }

    async function repost() {
        const id = destination;
        if (id === undefined || busy) return;
        busy = true;
        failed = false;
        const [x, y] = placeIn(id);
        failed =
            (await repostHowTo(howTo.getHowToId(), id, x, y)) !== 'reposted';
        if (!failed) destination = undefined;
        busy = false;
    }

    /** This how-to, opened in the given gallery's space. */
    function linkIn(galleryID: string): AppPath {
        return `/gallery/${galleryID}/howto?id=${howTo.getHowToId()}`;
    }

    async function unrepost(galleryID: string) {
        if (busy) return;
        busy = true;
        failed = !(await unrepostHowTo(howTo.getHowToId(), galleryID));
        busy = false;
    }
</script>

<!-- Rows of the Sharing grid in HowToForm, so `dt`/`dd` pairs rather than
     labelled boxes of their own. Where it belongs, when read somewhere else, is
     a link beside a label rather than a name inside a sentence: markup can't
     make a substituted name a link, and a gallery name in prose reads as prose. -->
{#if isRepostHere && home}
    <dt><LocalizedText path={(l) => l.ui.howto.viewer.repost.from} /></dt>
    <dd><Link to={linkIn(home.getID())}>{home.getName($locales)}</Link></dd>
{/if}

{#if reposts.length > 0}
    <dt><LocalizedText path={(l) => l.ui.howto.viewer.repost.prompt} /></dt>
    <dd>
        <ul class="control-row reposts">
            {#each reposts as gallery (gallery.getID())}
                <li class="repost">
                    <Link to={linkIn(gallery.getID())}
                        >{gallery.getName($locales)}</Link
                    >
                    {#if canUnrepostHowTo(howTo, home, gallery, $user?.uid)}
                        <Button
                            background
                            tip={(l) => l.ui.howto.viewer.repost.removeButton}
                            active={!busy && !$disconnected}
                            action={() => unrepost(gallery.getID())}
                            icon={CANCEL_SYMBOL}
                        />
                    {/if}
                </li>
            {/each}
        </ul>
    </dd>
{/if}

{#if destinations.length > 1}
    <dt>
        <label for="repostSelector"
            ><LocalizedText path={(l) => l.ui.howto.viewer.repost.add} /></label
        >
    </dt>
    <dd>
        <form class="control-row">
            <Options
                id="repostSelector"
                bind:value={destination}
                label={(l) => l.ui.howto.viewer.repost.selector}
                options={destinations}
                change={() => {}}
            />
            <Button
                submit
                background
                tip={(l) => l.ui.howto.viewer.repost.addButton}
                active={destination !== undefined && !busy && !$disconnected}
                action={() => repost()}
                >&gt;
            </Button>
        </form>
    </dd>
{/if}

{#if failed}
    <dd class="failed">
        <Notice inline text={(l) => l.ui.howto.viewer.repost.failed} />
    </dd>
{/if}

<style>
    form :global(.options-group) {
        min-width: 0;
    }

    /* A gallery and its remove button stay together; the list wraps between
       galleries, and a long name wraps inside its own link. */
    .reposts {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    /* Under the controls it failed on, across both columns. */
    .failed {
        grid-column: 1 / -1;
    }

    .repost {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing-half);
        min-width: 0;
    }
</style>
