<script lang="ts">
    import Fonts from '@basis/Fonts';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getAnnouncer,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { CharactersDB, DB, HowTos, locales, Projects } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import Project from '@db/projects/Project';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
    import type Example from '@nodes/Example';
    import Source from '@nodes/Source';
    import { getFaceCSS } from '@output/outputToCSS';
    import { toStage } from '@output/Stage';
    import { EXCEPTION_SYMBOL } from '@parser/Symbols';
    import { toMarkup } from '@parser/toMarkup';
    import Evaluator from '@runtime/Evaluator';
    import ExceptionValue from '@values/ExceptionValue';
    import MarkupValue from '@values/MarkupValue';
    import StructureValue from '@values/StructureValue';
    import type Value from '@values/Value';
    import { untrack } from 'svelte';
    import type { SvelteMap } from 'svelte/reactivity';
    import UnicodeString from '../../../../unicode/UnicodeString';
    import HowToForm from './HowToForm.svelte';
    import { movePermitted } from './HowToMovement';

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
    let text: string[] = $derived(howTo?.getText() ?? []);
    let howToId: string = $derived(howTo?.getHowToId() ?? '');
    let xcoord: number = $derived(howTo?.getCoordinates()[0] ?? 0);
    let ycoord: number = $derived(howTo?.getCoordinates()[1] ?? 0);
    let isPublished: boolean = $derived(howTo ? howTo.isPublished() : false);
    // logic for picking the preview glyph
    // if there are any examples in the how-to at all, use the first one's glyph per the same logic in ProjectPreview
    // if there are not any examples, we just use the first character of the first line of text
    type Preview = {
        foreground: string | null;
        background: string | null;
        face: string | null;
        previewText: string;
        character: string | null;
    };

    let formComponent = $state<HowToForm | undefined>();

    export function showPreview() {
        return formComponent?.showPreview();
    }

    let { foreground, background, face, previewText, character }: Preview =
        $derived.by(() => {
            let [markup, spaces] = toMarkup(text.join('\n\n'));

            // step 1: determine if there are any examples in the how-to text
            let example: Example | undefined = markup.getExamples()[0];

            // step 2: if undefined, just get the first character. if no first character, emdash
            if (!example) {
                let representativeText: string | undefined =
                    markup.getRepresentativeText();

                return {
                    foreground: null,
                    background: null,
                    face: null,
                    previewText: representativeText
                        ? new UnicodeString(representativeText)
                              .substring(0, 1)
                              .toString()
                        : '—',
                    character: null,
                };
            }

            // step 3: if there is an example, try evaluating it, following how ExampleUI.svelte creates a project
            // and how ProjectPreview.svelte evaluates it
            let project: Project = Project.make(
                null,
                'example',
                new Source('example', [example.program, spaces]),
                [],
                $locales.getLocales(),
            );
            let evaluator = new Evaluator(
                project,
                DB,
                $locales.getLocales(),
                false,
            );
            let value: Value | undefined = evaluator.getInitialValue();
            evaluator.stop();

            let characterName: string | null = value
                ? findCharacterName(value)
                : null;

            if (characterName) {
                let character: Character | null = null;
                CharactersDB.getByName(characterName).then((char) => {
                    if (char) character = char;
                });

                if (character) {
                    Projects.deleteProject(project.getID());
                    return {
                        foreground: null,
                        background: null,
                        face: null,
                        previewText: '',
                        character: characterToSVG(character, '100%'),
                    };
                }

                Projects.deleteProject(project.getID());
                return {
                    foreground: null,
                    background: null,
                    face: null,
                    previewText: '',
                    character: null,
                };
            }

            let stage = value ? toStage(evaluator, value) : undefined;
            if (stage && stage.face) Fonts.loadFace(stage.face);

            Projects.deleteProject(project.getID());

            return {
                face: stage ? getFaceCSS(stage.face) : null,
                foreground: stage
                    ? (stage.pose.color?.toCSS() ?? null)
                    : 'var(--wordplay-evaluation-color)',
                background: stage
                    ? stage.back.toCSS()
                    : value instanceof ExceptionValue || value === undefined
                      ? 'var(--wordplay-error)'
                      : null,
                previewText: stage
                    ? new UnicodeString(stage.getRepresentativeText($locales))
                          .substring(0, 1)
                          .toString()
                    : value
                      ? value.getRepresentativeText($locales)
                      : EXCEPTION_SYMBOL,
                character: null,
            };
        });

    // copied from ProjectPreview.svelte
    function findCharacterName(value: Value): string | null {
        // If it's a MarkupValue, check for character links
        if (value instanceof MarkupValue) {
            const nodes = value.markup.nodes();
            for (const node of nodes) {
                if (node instanceof ConceptLink) {
                    const parsed = ConceptLink.parse(node.getName());
                    if (parsed instanceof CharacterName) {
                        return `${parsed.username}/${parsed.name}`;
                    }
                }
            }
        }

        // If it's a StructureValue, check all its fields recursively
        if (value instanceof StructureValue) {
            const bindings = value.context.getBindingsByNames();
            for (const [, fieldValue] of bindings) {
                const result = findCharacterName(fieldValue);
                if (result) return result;
            }
        }
        return null;
    }

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
        if (!canEdit || whichDialogOpen) return;

        keyboardFocused = true;
    }

    function onblur() {
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
                        .concretize(
                            $locales.get(
                                (l) => l.ui.howto.announce.howToPosition,
                            ),
                            title,
                            xcoord.toString(),
                            ycoord.toString(),
                        )
                        .toText(),
                );
            }
        });
    });
</script>

{#snippet preview()}
    <div
        class="howtopreview"
        role="presentation"
        style:background
        style:color={foreground}
        style:font-family={face}
    >
        {#if character}
            {@html character}
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
