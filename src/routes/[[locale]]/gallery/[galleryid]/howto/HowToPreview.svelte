<script lang="ts">
    import Fonts from '@basis/Fonts';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import {
        getAnnouncer,
        getTip,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { CharactersDB, DB, HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import Project from '@db/projects/Project';
    import { enqueuePreviewCompute } from '@db/projects/previewQueue';
    import Source from '@nodes/Source';
    import { toMarkup } from '@parser/toMarkup';
    import { untrack } from 'svelte';
    import type { SvelteMap } from 'svelte/reactivity';
    import UnicodeString from '@unicode/UnicodeString';
    import HowToForm from './HowToForm.svelte';
    import { movePermitted } from './HowToMovement';
    import { pickPreviewExample } from './pickPreviewExample';

    interface Props {
        howTo: HowTo;
        cameraX: number;
        cameraY: number;
        whichMoving: string | undefined;
        notPermittedAreas: SvelteMap<string, [number, number, number, number]>;
        galleryCuratorCollaborators: string[];
        whichDialogOpen: string | undefined;
    }

    let {
        howTo = $bindable(),
        cameraX,
        cameraY,
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
    type Displayed = {
        foreground: string | null;
        background: string | null;
        face: string | null;
        previewText: string;
        characterName: string | null;
    };

    let formComponent = $state<HowToForm | undefined>();

    export function showPreview() {
        return formComponent?.showPreview();
    }

    let displayed = $state<Displayed | null>(null);
    let character = $state<Character | null>(null);

    $effect(() => {
        const [markup, spaces] = toMarkup(text.join('\n\n'));
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
                previewText: representativeText
                    ? new UnicodeString(representativeText)
                          .substring(0, 1)
                          .toString()
                    : '—',
                characterName: null,
            };
            character = null;
            return;
        }

        // Has an example — defer to the queue. Until it resolves the tile
        // shows a Spinning placeholder.
        displayed = null;
        character = null;
        let cancelled = false;
        const project = Project.make(
            null,
            'example',
            new Source('example', [example.program, spaces]),
            [],
            $locales.getLocales(),
        );
        enqueuePreviewCompute(project, $locales, DB)
            .then((extracted) => {
                if (cancelled) return;
                if (extracted.face) Fonts.loadFace(extracted.face);
                displayed = {
                    foreground: extracted.foreground,
                    background: extracted.background,
                    face: extracted.face,
                    previewText: extracted.text,
                    characterName: extracted.characterName,
                };
            })
            .catch(() => {
                if (cancelled) return;
                // On failure show an em-dash placeholder rather than
                // leaving the Spinning forever.
                displayed = {
                    foreground: null,
                    background: null,
                    face: null,
                    previewText: '—',
                    characterName: null,
                };
            });
        return () => {
            cancelled = true;
        };
    });

    // Resolve the Character SVG once the preview names one.
    $effect(() => {
        const name = displayed?.characterName ?? null;
        if (!name) {
            character = null;
            return;
        }
        let cancelled = false;
        CharactersDB.getByName(name)
            .then((char) => {
                if (!cancelled && char) character = char;
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    });

    const foreground = $derived(displayed?.foreground ?? null);
    const background = $derived(displayed?.background ?? null);
    const face = $derived(displayed?.face ?? null);
    const previewText = $derived(displayed?.previewText ?? '');

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

    let renderX: number = $derived(xcoord + (isPublished ? cameraX : 0));
    let renderY: number = $derived(ycoord + (isPublished ? cameraY : 0));

    function onpointerdown(e: PointerEvent) {
        if (!canEdit || whichDialogOpen) return;

        e.stopPropagation();

        whichMoving = howToId;
    }

    function onpointerup() {
        if (whichMoving !== howToId || !canEdit || whichDialogOpen) return;

        whichMoving = undefined;

        onDropHowTo();
    }

    // // Drag and drop function referenced from: https://svelte.dev/playground/7d674cc78a3a44beb2c5a9381c7eb1a9?version=5.46.0
    function onpointermove(e: PointerEvent) {
        if (!canEdit || whichMoving !== howToId || whichDialogOpen) return;
        let intendX = xcoord + e.movementX;
        let intendY = ycoord + e.movementY;

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
        if (whichMoving === howToId) whichMoving = undefined;

        onDropHowTo();
    }

    // if navigating using a keyboard, the how-to is put "move mode" when arrow keys are used
    function onkeydown(event: KeyboardEvent) {
        if (!canEdit || !keyboardFocused || whichDialogOpen) return;

        let intendX: number;
        let intendY: number;

        // if this item isn't the one that is moving, then don't do anything
        if (whichMoving && whichMoving !== howToId) return;

        switch (event.key) {
            case 'ArrowUp':
                intendY = ycoord - 10;
                if (
                    movePermitted(
                        xcoord,
                        intendY,
                        width,
                        height,
                        howToId,
                        notPermittedAreas,
                    )
                ) {
                    ycoord = intendY;
                    whichMoving = howToId;
                }

                event.preventDefault();
                break;
            case 'ArrowDown':
                intendY = ycoord + 10;
                if (
                    movePermitted(
                        xcoord,
                        intendY,
                        width,
                        height,
                        howToId,
                        notPermittedAreas,
                    )
                ) {
                    ycoord = intendY;
                    whichMoving = howToId;
                }

                event.preventDefault();
                break;
            case 'ArrowLeft':
                intendX = xcoord - 10;
                if (
                    movePermitted(
                        intendX,
                        ycoord,
                        width,
                        height,
                        howToId,
                        notPermittedAreas,
                    )
                ) {
                    xcoord = intendX;
                    whichMoving = howToId;
                }

                event.preventDefault();
                break;
            case 'ArrowRight':
                intendX = xcoord + 10;
                if (
                    movePermitted(
                        intendX,
                        ycoord,
                        width,
                        height,
                        howToId,
                        notPermittedAreas,
                    )
                ) {
                    xcoord = intendX;
                    whichMoving = howToId;
                }

                event.preventDefault();
                break;

            default:
                return;
        }
    }

    function onDropHowTo() {
        if (!howTo) return;

        howTo = new HowTo({
            ...howTo.getData(),
            xcoord: xcoord,
            ycoord: ycoord,
        });

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
        if (previewNode) hint.show(title, previewNode);
    }

    function hideTip() {
        hint.hide();
    }
</script>

{#snippet preview()}
    <div
        class="howtopreview"
        role="presentation"
        style:background
        style:color={foreground}
        style:font-family={face}
    >
        {#if displayed === null}
            <Spinning />
        {:else if character}
            {@html characterToSVG(character, '100%')}
        {:else}
            {previewText}
        {/if}
    </div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    class="howto"
    style:left={`${renderX}px`}
    style:top={`${renderY}px`}
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
    }

    .howtotitle {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: var(--wordplay-font-size);
        max-height: calc(2 * var(--wordplay-font-size));
    }

    .howtopreview {
        font-size: var(--previewSize);
        display: flex;
        /** For some reason this is necessary for keeping the character centered. */
        align-items: center;
        justify-content: center;
        background: var(--wordplay-background);
        text-decoration: none;
        color: var(--wordplay-foreground);
        aspect-ratio: 1 / 1;
        width: auto;
        height: auto;
        border-radius: var(--wordplay-border-radius);
    }
</style>
