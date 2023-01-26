<svelte:options immutable={true} />

<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import type Project from '../../models/Project';
    import type Verse from '../../output/Verse';
    import { playing, selectedOutput } from '../../models/stores';
    import { preferredLanguages } from '@translation/translations';
    import PhraseView from './PhraseView.svelte';
    import { loadedFonts } from '../../native/Fonts';
    import { PX_PER_METER, toCSS } from '../../output/phraseToCSS';
    import type Phrase from '../../output/Phrase';
    import type Group from '../../output/Group';
    import type Place from '../../output/Place';
    import { writable } from 'svelte/store';
    import Evaluate from '@nodes/Evaluate';
    import { VerseType } from '../../output/Verse';

    export let project: Project;
    export let verse: Verse;
    export let interactive: boolean;
    export let editable: boolean;

    let ignored = false;
    let view: HTMLElement | null = null;

    let editableStore = writable<boolean>(editable);
    setContext('editable', editableStore);
    $: editableStore.set(editable);

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), 250);
    }

    function handleMouseDown(event: MouseEvent) {
        view?.focus();

        if (project.evaluator.isPlaying())
            project.streams.mouseButton.record(true);
        else ignore();

        if (editable && selectedOutput && $selectedOutput) {
            const nodes = $selectedOutput;
            const index = nodes.indexOf(verse.value.creator);

            // If the creator of this verse is a verse, toggle it's selection
            if (
                verse.value.creator instanceof Evaluate &&
                verse.value.creator.is(
                    VerseType,
                    project.getNodeContext(verse.value.creator)
                )
            ) {
                // If we clicked directly on this, set the selection to only this
                if (
                    event.target instanceof Element &&
                    event.target.closest('.phrase') === null
                ) {
                    selectedOutput.set(index >= 0 ? [] : [verse.value.creator]);
                }
                // Otherwise, remove this from the selection
                else if ($selectedOutput) {
                    if (index >= 0)
                        selectedOutput.set([
                            ...nodes.slice(0, index),
                            ...nodes.slice(index + 1),
                        ]);
                }
            }
        }
    }

    function handleMouseUp() {
        if (project.evaluator.isPlaying())
            project.streams.mouseButton.record(false);
        else ignore();
    }

    function handleMouseMove(event: MouseEvent) {
        if (project.evaluator.isPlaying())
            project.streams.mousePosition.record(event.offsetX, event.offsetY);
        // Don't give feedback on this; it's not expected.
    }

    function handleKeyUp(event: KeyboardEvent) {
        // Never handle tab; that's for keyboard navigation.
        if (event.key === 'Tab') return;

        if (project.evaluator.isPlaying()) {
            project.streams.keyboard.record(event.key, false);
        } else ignore();
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Never handle tab; that's for focus navigation.
        if (event.key === 'Tab') return;

        // Adjust focus
        if (event.shiftKey) {
            const increment = 1;
            if (event.key === 'ArrowLeft') {
                focus = project.evaluator.animations.adjustFocus(
                    -1 * increment,
                    0,
                    0
                );
                return;
            } else if (event.key === 'ArrowRight') {
                focus = project.evaluator.animations.adjustFocus(
                    increment,
                    0,
                    0
                );
                return;
            } else if (event.key === 'ArrowUp') {
                focus = project.evaluator.animations.adjustFocus(
                    0,
                    -1 * increment,
                    0
                );
                return;
            } else if (event.key === 'ArrowDown') {
                focus = project.evaluator.animations.adjustFocus(
                    0,
                    increment,
                    0
                );
                return;
            } else if (event.key === '+') {
                focus = project.evaluator.animations.adjustFocus(
                    0,
                    0,
                    increment
                );
                return;
            } else if (event.key === '_') {
                focus = project.evaluator.animations.adjustFocus(
                    0,
                    0,
                    -1 * increment
                );
                return;
            }
        }

        // Record the key event if it wasn't handled above.
        if (project.evaluator.isPlaying()) {
            project.streams.keyboard.record(event.key, true);
        } else ignore();

        handleOutputSelection(event);
    }

    function handleOutputSelection(event: KeyboardEvent) {
        if (selectedOutput === undefined) return;

        // // meta-a: select all phrases
        // if (editable && event.key === 'a' && (event.metaKey || event.ctrlKey))
        //     selectedOutput.set(
        //         Array.from(
        //             new Set(visible.map((phrase) => phrase.value.creator))
        //         )
        //     );
    }

    let mounted = false;
    onMount(() => (mounted = true));

    // On every verse change, compute the canonical places of all phrases.
    let visible: Phrase[] = [];
    let places = new Map<Group, Place>();
    let exiting: Map<Phrase, Place> = new Map();
    let focus = project.evaluator.animations.getFocus();
    setContext('animations', project.evaluator.animations);
    $: ({ places, visible, exiting, focus } =
        project.evaluator.animations.update(
            verse,
            $preferredLanguages,
            $loadedFonts
        ));
</script>

{#if mounted}
    <div
        class="verse {interactive && $playing ? '' : 'inert'} {ignored
            ? 'ignored'
            : ''}"
        tabIndex={interactive ? 0 : null}
        style={toCSS({
            'font-family': verse.font,
            background: verse.background.toCSS(),
            color: verse.foreground.toCSS(),
            transform: `${
                verse.tilt.toNumber() !== 0
                    ? `rotate(${verse.tilt.toNumber()}deg)`
                    : ''
            } translate(${-PX_PER_METER * focus.x.toNumber()}px, ${
                -PX_PER_METER * focus.y.toNumber()
            }px) scale(${Math.abs(PX_PER_METER / focus.z.toNumber())})`,
        })}
        on:mousedown={(event) => (interactive ? handleMouseDown(event) : null)}
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        bind:this={view}
    >
        <div class="viewport">
            <!-- Render all visible phrases at their places, as well as any exiting phrases -->
            {#each visible as phrase}
                {@const place = places.get(phrase)}
                {@const context =
                    project.evaluator.animations.getRenderContext()}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                {#if place}
                    <PhraseView
                        {phrase}
                        {place}
                        focus={verse.focus ?? context.focus}
                        {context}
                    />
                {:else}
                    <span>No place for Phrase, oops</span>
                {/if}
            {/each}
            {#each [...exiting] as [phrase, place]}
                {@const context =
                    project.evaluator.animations.getRenderContext()}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                <PhraseView
                    {phrase}
                    {place}
                    focus={verse.focus ?? context.focus}
                    {context}
                />
            {/each}
        </div>
    </div>
{/if}

<style>
    .verse {
        user-select: none;
        width: 100%;
        height: 100%;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: transform 0.25s ease-out;
    }

    .verse:focus {
        outline: none;
    }

    .ignored {
        animation: shake 0.1s 1;
    }

    .viewport {
        width: 100%;
        height: 100%;
        transform: translate(50%, 50%);
    }

    :global(.group.debug, .phrase.debug) {
        border: 1px dotted red;
    }
</style>
