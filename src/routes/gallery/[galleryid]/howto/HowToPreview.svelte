<script lang="ts">
    import Fonts from '@basis/Fonts';
    import { characterToSVG, type Character } from '@db/characters/Character';
    import { CharactersDB, DB, HowTos, locales } from '@db/Database';
    import HowTo from '@db/howtos/HowToDatabase.svelte';
    import Project from '@db/projects/Project';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
    import type Example from '@nodes/Example';
    import Markup from '@nodes/Markup';
    import Source from '@nodes/Source';
    import { getFaceCSS } from '@output/outputToCSS';
    import { toStage } from '@output/Stage';
    import { EXCEPTION_SYMBOL } from '@parser/Symbols';
    import Evaluator from '@runtime/Evaluator';
    import ExceptionValue from '@values/ExceptionValue';
    import MarkupValue from '@values/MarkupValue';
    import StructureValue from '@values/StructureValue';
    import type Value from '@values/Value';
    import UnicodeString from '../../../../unicode/UnicodeString';
    import HowToForm from './HowToForm.svelte';

    interface Props {
        howTo: HowTo;
        cameraX: number;
        cameraY: number;
        childMoving: boolean;
    }

    let {
        howTo = $bindable(),
        cameraX,
        cameraY,
        childMoving = $bindable(),
    }: Props = $props();

    let title: string = $derived(howTo?.getTitle() ?? '');
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

    let { foreground, background, face, previewText, character }: Preview =
        $derived.by(() => {
            let markup: Markup = Markup.words(text.join('\n\n'));

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
                new Source('example', [example.program, markup.spaces]),
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

                if (character)
                    return {
                        foreground: null,
                        background: null,
                        face: null,
                        previewText: '',
                        character: characterToSVG(character, '100%'),
                    };
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

    childMoving = false;
    let thisChildMoving = false;
    let thisChildMoved = false;

    let renderX: number = $derived(xcoord + (isPublished ? cameraX : 0));
    let renderY: number = $derived(ycoord + (isPublished ? cameraY : 0));

    // Drag and drop function referenced from: https://svelte.dev/playground/7d674cc78a3a44beb2c5a9381c7eb1a9?version=5.46.0
    function onMouseDown() {
        childMoving = true;
        thisChildMoving = true;
    }

    function onMouseMove(e: MouseEvent) {
        if (thisChildMoving) {
            xcoord += e.movementX;
            ycoord += e.movementY;
        }
    }

    function onKeyPress(event: KeyboardEvent) {
        if (thisChildMoving) {
            switch (event.key) {
                case 'ArrowUp':
                    ycoord -= 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                case 'ArrowDown':
                    ycoord += 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                case 'ArrowLeft':
                    xcoord -= 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;
                case 'ArrowRight':
                    xcoord += 10;

                    thisChildMoved = true;
                    event.preventDefault();
                    break;

                default:
                    return;
            }
        }
    }

    function onDropHowTo(clientX: number, clientY: number) {
        childMoving = false;

        if (thisChildMoving) {
            thisChildMoving = false;

            if (!howTo) return;

            let published = howTo.isPublished();

            // if is a draft and moved outside of the drafts space, then publish it
            if (!published) {
                const selfArea = document
                    .getElementById(`howto-${howToId}`)
                    ?.getBoundingClientRect();
                const stickyArea = document
                    .getElementById('stickyArea')
                    ?.getBoundingClientRect();

                console.log('selfArea:', selfArea);
                console.log('stickyArea:', stickyArea);

                if (
                    stickyArea &&
                    selfArea &&
                    // check all corners of the preview are outside of the drafts area
                    (stickyArea.left > selfArea.right ||
                        stickyArea.right < selfArea.left ||
                        stickyArea.top > selfArea.bottom ||
                        stickyArea.bottom < selfArea.top)
                ) {
                    published = true;
                    xcoord = clientX - cameraX;
                    ycoord = clientY - cameraY;
                }
            }

            howTo = new HowTo({
                ...howTo.getData(),
                xcoord: xcoord,
                ycoord: ycoord,
                published: published,
            });

            HowTos.updateHowTo(howTo, true);
        }
    }

    function onMouseUp(event: MouseEvent) {
        onDropHowTo(event.clientX, event.clientY);
    }

    function onLoseFocus() {
        if (thisChildMoved) {
            thisChildMoved = false;
            let item = document
                .getElementById(`howto-${howToId}`)
                ?.getBoundingClientRect();

            onDropHowTo(item?.left ?? 0, item?.top ?? 0);
        } else {
            thisChildMoving = false;
            childMoving = false;
        }
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
    style:position={isPublished ? 'absolute' : 'relative'}
    style:left={`${renderX}px`}
    style:top={`${renderY}px`}
    onmousedown={onMouseDown}
    id="howto-{howToId}"
    tabindex="0"
    aria-label="How-to preview for {title}"
    onfocus={onMouseDown}
    onblur={onLoseFocus}
    onkeydown={onKeyPress}
>
    <div class="howtotitle"> {title}</div>

    <HowToForm editingMode={false} bind:howTo {preview} />
</div>
<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<style>
    /* setting preview size as a var here that can be changed here, will adjust everything else */
    :root {
        --previewSize: 4rem;
    }

    .howto {
        cursor: pointer;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        max-width: calc(var(--previewSize) * 1.5 + var(--wordplay-spacing) * 2);
        height: auto;
        padding: var(--wordplay-spacing);
    }

    .howto:hover {
        border-color: var(--wordplay-highlight-color);
        border-width: var(--wordplay-focus-width);
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
    }
</style>
