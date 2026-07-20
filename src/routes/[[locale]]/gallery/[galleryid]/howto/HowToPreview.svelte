<script lang="ts">
    import GlyphTile from '@components/app/GlyphTile.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getAnnouncer,
        getTip,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import { pickPreviewExample } from '@concepts/pickPreviewExample';
    import { DB, HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import { enqueuePreviewCompute } from '@db/projects/previewQueue';
    import Project from '@db/projects/Project';
    import type { SerializedPreviewContent } from '@db/projects/ProjectSchemas';
    import Source from '@nodes/Source';
    import { toMarkup } from '@parser/toMarkup';
    import UnicodeString from '@unicode/UnicodeString';
    import { untrack } from 'svelte';
    import type { SvelteMap } from 'svelte/reactivity';
    import HowToForm from './HowToForm.svelte';
    import { getLanguageDirection } from '@locale/LanguageCode';
    import { toLocaleString } from '@locale/LocaleText';
    import {
        findHowToPlacement,
        movePermitted,
        snapToNearestEdge,
    } from './HowToMovement';

    interface Props {
        howTo: HowTo;
        cameraX: number;
        cameraY: number;
        canvasWidth: number;
        canvasHeight: number;
        whichMoving: string | undefined;
        notPermittedAreas: SvelteMap<string, [number, number, number, number]>;
        galleryCuratorCollaborators: string[];
        whichDialogOpen: string | undefined;
    }

    let {
        howTo = $bindable(),
        cameraX = $bindable(),
        cameraY = $bindable(),
        canvasWidth,
        canvasHeight,
        whichMoving = $bindable(),
        notPermittedAreas = $bindable(),
        galleryCuratorCollaborators,
        whichDialogOpen = $bindable(),
    }: Props = $props();

    let title: string = $derived(
        howTo?.getTitleInLocale($locales.getLocaleString()) ?? '',
    );
    let text: string[] = $derived(
        howTo?.getTextInLocale($locales.getLocaleString()) ?? [],
    );
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    let xcoord: number = $derived(howTo?.getCoordinates()[0] ?? 0);
    let ycoord: number = $derived(howTo?.getCoordinates()[1] ?? 0);
    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);
    // Preview glyph for the how-to. If the how-to text has an embedded
    // example, evaluate it (via the off-main-thread preview queue) and use
    // its representative glyph. If not, take the first grapheme of the
    // markup's natural-language text as a cheap fallback. The queue ensures
    // we don't evaluate during render, so a page of how-tos doesn't hang
    // WebKit.
    let formComponent = $state<HowToForm | undefined>();

    export function showPreview() {
        return formComponent?.showPreview();
    }

    let displayed = $state<SerializedPreviewContent | null>(null);

    // Memoize the join on string value so snapshot-driven howTo
    // reassignments (which create a fresh `text` array reference even
    // when the text content is identical) don't re-enqueue every
    // preview compute through the single-slot queue. Without this,
    // any classmate's autosave in the same gallery flashes every
    // preview tile to the spinning placeholder and many never settle
    // because they get cancelled by the next reassignment first.
    let joinedText: string = $derived(text.join('\n\n'));

    $effect(() => {
        // Fast path: use the preview persisted to Firestore on the author's
        // last save. Readers skip the evaluation queue entirely.
        const cached = howTo?.getPreview();
        if (cached) {
            displayed = cached;
            return;
        }

        const [markup, spaces] = toMarkup(joinedText);
        // Starred (`⭐`) example wins; otherwise the first example. See
        // pickPreviewExample for the priority + its tests.
        const example = pickPreviewExample(markup);

        // No example to evaluate — synchronously derive a fallback from the
        // markup's plain text. Cheap, no evaluator needed.
        if (!example) {
            const representativeText: string | undefined =
                markup.getRepresentativeText();
            displayed = {
                foreground: null,
                background: null,
                face: null,
                text: representativeText
                    ? new UnicodeString(representativeText)
                          .substring(0, 1)
                          .toString()
                    : '—',
                characterName: null,
            };
            return;
        }

        // Has an example — defer to the queue. Until it resolves the tile
        // shows a Spinning placeholder.
        displayed = null;
        let cancelled = false;
        const project = Project.make(
            null,
            'example',
            new Source('example', [example.program, spaces]),
            [],
            $locales.getLocales(),
        );
        enqueuePreviewCompute(project, $locales, DB, howTo.getHowToId())
            .then((extracted) => {
                if (cancelled) return;
                displayed = extracted;
            })
            .catch(() => {
                if (cancelled) return;
                // On failure show an em-dash placeholder rather than
                // leaving the Spinning forever.
                displayed = {
                    foreground: null,
                    background: null,
                    face: null,
                    text: '—',
                    characterName: null,
                };
            });
        return () => {
            cancelled = true;
        };
    });

    // code that enables drag and drop functionality

    // don't allow the user to move the how-to if they don't have write permission to the db
    // currently, only the creator, collaborators of the how-to + the curators, collaborators of the gallery can write
    let allWriters: string[] = $derived([
        ...howTo.getCollaborators(),
        howTo.getCreator(),
        ...galleryCuratorCollaborators,
    ]);
    let user = getUser();
    let canEdit: boolean = $derived(
        isAuthenticated($user) && allWriters.includes($user.uid),
    );

    /** Anchor recorded at drag start: the viewport-space cursor position
     *  and the tile's world-space position. We compute new positions as
     *  origin.xcoord + (e.clientX - origin.clientX) instead of summing
     *  e.movementX so the tile stays exactly under the pointer for the
     *  full drag — even fast moves and long drags can't accumulate
     *  delta-rounding drift between cursor and tile. */
    let dragOrigin: {
        clientX: number;
        clientY: number;
        xcoord: number;
        ycoord: number;
    } | null = null;

    /** Margin (in canvas-local pixels) we try to keep between the
     *  moving tile and the visible canvas edge — matches
     *  `--wordplay-spacing` so the auto-pan keeps the tile inside the
     *  same comfortable bounds the rest of the layout uses. */
    const AUTO_PAN_PAD = 16;

    /** Pan the camera the minimum amount needed to keep the moving
     *  tile inside the visible canvas. xcoord stays in world space —
     *  only cameraX/Y shift — so the cursor anchor (origin.xcoord +
     *  cursor delta) keeps working without correction; the tile slides
     *  visually with the camera while the cursor follows the same
     *  world position. */
    function autoPanToShowTile() {
        if (!isPublished) return;
        if (canvasWidth <= 0 || canvasHeight <= 0) return;

        const renderX = xcoord + cameraX;
        const renderY = ycoord + cameraY;
        let panX = 0;
        let panY = 0;

        if (renderX < AUTO_PAN_PAD) {
            panX = AUTO_PAN_PAD - renderX;
        } else if (renderX + width > canvasWidth - AUTO_PAN_PAD) {
            panX = canvasWidth - AUTO_PAN_PAD - (renderX + width);
        }

        if (renderY < AUTO_PAN_PAD) {
            panY = AUTO_PAN_PAD - renderY;
        } else if (renderY + height > canvasHeight - AUTO_PAN_PAD) {
            panY = canvasHeight - AUTO_PAN_PAD - (renderY + height);
        }

        if (panX !== 0) cameraX += panX;
        if (panY !== 0) cameraY += panY;
    }

    // Latest pointer position waiting for the next animation frame.
    // Storing absolute clientX/Y (not deltas) means we only need the
    // most recent event — earlier ones in the same frame are redundant.
    let pendingClientX: number | null = null;
    let pendingClientY: number | null = null;
    let dragRafID: number | undefined;

    function flushDrag() {
        if (dragRafID !== undefined) {
            cancelAnimationFrame(dragRafID);
            dragRafID = undefined;
        }
        if (
            dragOrigin !== null &&
            pendingClientX !== null &&
            pendingClientY !== null
        ) {
            xcoord = dragOrigin.xcoord + (pendingClientX - dragOrigin.clientX);
            ycoord = dragOrigin.ycoord + (pendingClientY - dragOrigin.clientY);
            autoPanToShowTile();
            pendingClientX = null;
            pendingClientY = null;
        }
    }

    function onpointerdown(e: PointerEvent) {
        if (!canEdit || whichDialogOpen) return;

        e.stopPropagation();

        // Capture the pointer so the matching pointerup is delivered to
        // this element no matter where the cursor ends up — releasing
        // outside the canvas (or even outside the browser viewport)
        // would otherwise leave whichMoving === howToId and the tile
        // would keep following the cursor until the next click.
        (e.currentTarget as Element).setPointerCapture(e.pointerId);

        dragOrigin = {
            clientX: e.clientX,
            clientY: e.clientY,
            xcoord,
            ycoord,
        };
        whichMoving = howToId;
    }

    function onpointerup() {
        if (whichMoving !== howToId || !canEdit || whichDialogOpen) return;

        flushDrag();
        dragOrigin = null;
        whichMoving = undefined;

        onDropHowTo();
    }

    // Drag is unconstrained — the cursor should never fight the user.
    // Collision and out-of-range correction happens in onDropHowTo,
    // which snaps the dropped tile to the nearest valid resting spot.
    function onpointermove(e: PointerEvent) {
        if (
            !canEdit ||
            whichMoving !== howToId ||
            whichDialogOpen ||
            dragOrigin === null
        )
            return;
        pendingClientX = e.clientX;
        pendingClientY = e.clientY;
        if (dragRafID === undefined) {
            dragRafID = requestAnimationFrame(() => {
                dragRafID = undefined;
                flushDrag();
            });
        }
    }

    let keyboardFocused: boolean = $state(false);
    function onfocus() {
        showTip();

        if (!canEdit || whichDialogOpen) return;

        keyboardFocused = true;
    }

    function onblur() {
        hideTip();

        if (!canEdit || whichDialogOpen) return;

        keyboardFocused = false;
        if (whichMoving === howToId) {
            flushDrag();
            whichMoving = undefined;
        }

        onDropHowTo();
    }

    // if navigating using a keyboard, the how-to is put "move mode" when arrow keys are used
    function onkeydown(event: KeyboardEvent) {
        if (!canEdit || !keyboardFocused || whichDialogOpen) return;

        // if this item isn't the one that is moving, then don't do anything
        if (whichMoving && whichMoving !== howToId) return;

        // Keyboard moves in discrete 10px steps. Unlike the unconstrained
        // pointer drag, each step is gated by movePermitted so a screen-
        // reader user never lands the tile on top of another one — there
        // is no "release" event to snap on for keyboard navigation, so
        // the prevention has to happen at step time.
        let intendX = xcoord;
        let intendY = ycoord;
        switch (event.key) {
            case 'ArrowUp':
                intendY -= 10;
                break;
            case 'ArrowDown':
                intendY += 10;
                break;
            case 'ArrowLeft':
                intendX -= 10;
                break;
            case 'ArrowRight':
                intendX += 10;
                break;
            default:
                return;
        }
        event.preventDefault();
        if (
            movePermitted(
                intendX,
                intendY,
                width,
                height,
                howToId,
                notPermittedAreas,
            )
        ) {
            xcoord = intendX;
            ycoord = intendY;
            whichMoving = howToId;
            autoPanToShowTile();
        }
    }

    function onDropHowTo() {
        if (!howTo) return;

        // If the user released on top of another tile (or way out in
        // empty space far from the cluster), snap to a valid resting
        // spot. Drag itself is unconstrained — see onpointermove — so
        // this is where collision and out-of-range correction lands.
        //
        // Prefer snap-to-nearest-edge of the overlapped tile so the
        // dropped tile stays right where the user released it. Spiral
        // outward only when no edge fits (every neighbor of the
        // target is also occupied, or the drop was far enough out
        // that the cluster-rebase needs to kick in).
        if (
            width > 0 &&
            height > 0 &&
            !movePermitted(
                xcoord,
                ycoord,
                width,
                height,
                howToId,
                notPermittedAreas,
            )
        ) {
            const edgeSnap = snapToNearestEdge(
                xcoord,
                ycoord,
                width,
                height,
                howToId,
                notPermittedAreas,
            );
            if (edgeSnap !== null) {
                [xcoord, ycoord] = edgeSnap;
            } else {
                [xcoord, ycoord] = findHowToPlacement(
                    notPermittedAreas,
                    xcoord,
                    ycoord,
                    width,
                    height,
                    howToId,
                );
            }
        }

        howTo = howTo.withFields({ xcoord, ycoord });

        HowTos.updateHowTo(howTo, true);
    }

    // collision detection
    let width: number = $state(0);
    let height: number = $state(0);

    $effect(() => {
        notPermittedAreas.set(howToId, [xcoord, ycoord, width, height]);
    });

    // when position of the preview changes, announce it
    const announce = getAnnouncer();

    $effect(() => {
        xcoord;
        ycoord;

        untrack(() => {
            if ($announce) {
                $announce(
                    'how-to moved',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize((l) => l.ui.howto.announce.howToPosition, {
                            title,
                            x: xcoord.toString(),
                            y: ycoord.toString(),
                        })
                        .toText(),
                );
            }
        });
    });

    let hint = getTip();
    let previewNode: HTMLDivElement;

    function showTip() {
        if (!previewNode || howTo === undefined) return;
        // Show the how-to title in each chosen locale, stacked and styled like other hints.
        const seen = new Set<string>();
        const entries = [];
        for (const locale of $locales.getPreferredLocales()) {
            const text = howTo.getTitleInLocale(toLocaleString(locale));
            if (text.length === 0 || seen.has(text)) continue;
            seen.add(text);
            entries.push({
                language: locale.language,
                direction: getLanguageDirection(locale.language),
                text,
            });
        }
        hint.showMultilingual(entries, previewNode);
    }

    function hideTip() {
        hint.hide();
    }
</script>

{#snippet preview()}
    <div class="howtopreview">
        <GlyphTile preview={displayed} />
    </div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    class="howto"
    class:moving={whichMoving === howToId}
    style:left={`${xcoord}px`}
    style:top={`${ycoord}px`}
    id="howto-{howToId}"
    tabindex="0"
    bind:clientWidth={width}
    bind:clientHeight={height}
    style:border-color={whichMoving === howToId
        ? 'var(--wordplay-highlight-color)'
        : 'var(--wordplay-border-color)'}
    style:border-width={whichMoving === howToId
        ? 'var(--wordplay-focus-width)'
        : ''}
    {onpointerdown}
    {onpointerup}
    {onpointermove}
    {onfocus}
    {onblur}
    {onkeydown}
    onpointerenter={showTip}
    onpointerleave={hideTip}
    ontouchstart={showTip}
    ontouchend={hideTip}
    ontouchcancel={hideTip}
    bind:this={previewNode}
>
    <div class="howtotitle"> <MarkupHTMLView markup={title} /></div>

    <HowToForm
        editingMode={false}
        bind:howTo
        bind:this={formComponent}
        {notPermittedAreas}
        {cameraX}
        {cameraY}
        {preview}
        bind:whichDialogOpen
    />
</div>
<svelte:window onblur={onpointerup} {onpointerup} {onpointermove} />

<style>
    /* setting preview size as a var here that can be changed here, will adjust everything else */
    :root {
        --previewSize: 4rem;
    }

    .howto {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        cursor: pointer;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        max-width: calc(var(--previewSize) * 1.5 + var(--wordplay-spacing) * 2);
        height: auto;
        padding: var(--wordplay-spacing);
        margin: var(--wordplay-spacing);
        touch-action: none;
        /* Tiles overlap during drag (and can naturally end up close to
           each other after a snap). An opaque background keeps the
           contents from showing through to whatever is behind. */
        background: var(--wordplay-background);
        /* The title text used to be selectable, so a mousedown that
           skimmed across letters started a text selection instead of a
           drag — leaving a stuck selection rectangle and no actual
           drag. Disable selection on the whole tile so every mousedown
           goes straight to the drag path. */
        user-select: none;
        -webkit-user-select: none;
    }

    /* While a tile is being dragged or keyboard-moved, hoist it above
       its siblings so it always reads as the active one even when it
       briefly overlaps another tile mid-motion. */
    .howto.moving {
        z-index: 1;
    }

    .howtotitle {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: var(--wordplay-font-size);
        max-height: calc(2 * var(--wordplay-font-size));
    }

    /* The sized container for the shared GlyphTile, which fills it and
       inherits its font size. Overflow is hidden so the tile's background
       stays within the rounded corners. */
    .howtopreview {
        font-size: var(--previewSize);
        aspect-ratio: 1 / 1;
        width: auto;
        height: auto;
        border-radius: var(--wordplay-border-radius);
        overflow: hidden;
    }
</style>
