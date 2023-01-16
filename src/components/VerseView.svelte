<svelte:options immutable={true} />

<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import type Project from '../models/Project';
    import type Verse from '../output/Verse';
    import { playing } from '../models/stores';
    import { preferredLanguages } from '../translation/translations';
    import PhraseView from './PhraseView.svelte';
    import { loadedFonts } from '../native/Fonts';
    import { toCSS } from '../output/phraseToCSS';
    import type Phrase from '../output/Phrase';
    import type Group from '../output/Group';
    import type Place from '../output/Place';
    import { getSelectedOutput } from '../editor/util/Contexts';
    import type Node from '../nodes/Node';

    export let project: Project;
    export let verse: Verse;
    export let interactive: boolean;

    let ignored = false;
    let view: HTMLElement | null = null;

    let selectedOutput = getSelectedOutput();

    $: selected = $selectedOutput.includes(verse.value.creator);

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), 250);
    }

    function handleMouseDown(event: MouseEvent) {
        view?.focus();
        if (project.evaluator.isPlaying())
            project.streams.mouseButton.record(true);
        else ignore();

        if(selectedOutput && $selectedOutput) {
            const nodes = $selectedOutput;
            const index = nodes.indexOf(verse.value.creator);

            // If we clicked directly on this, set the selection to only this
            if(event.target instanceof Element && event.target.closest(".phrase") === null) {
                selectedOutput.set(index >= 0 ? [] : [ verse.value.creator ]);
            }
            // Otherwise, remove this from the selection
            else if($selectedOutput) {
                if(index >= 0)
                    selectedOutput.set([ ... nodes.slice(0, index), ... nodes.slice(index + 1)]);
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
            event.preventDefault();
        } else ignore();
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Never handle tab; that's for keyboard navigation.
        if (event.key === 'Tab') return;

        if (project.evaluator.isPlaying()) {
            project.streams.keyboard.record(event.key, true);
            event.preventDefault();
        } else ignore();

        handleOutputSelection(event);

    }

    function handleOutputSelection(event: KeyboardEvent) {
        if(selectedOutput === undefined) return;

        // meta-a: select all phrases
        if(event.key === "a" && (event.metaKey || event.ctrlKey))
            selectedOutput.set(Array.from(new Set(visible.map(phrase => phrase.value.creator))));

    }

    let mounted = false;
    onMount(() => (mounted = true));

    // On every verse change, compute the canonical places of all phrases.
    let visible: Phrase[] = [];
    let places = new Map<Group, Place>();
    let exiting: Map<Phrase, Place> = new Map();
    setContext('animations', project.evaluator.animations);
    $: ({ places, visible, exiting } = project.evaluator.animations.update(
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
        class:selected
        tabIndex={interactive ? 0 : null}
        bind:this={view}
        style={toCSS({
            'font-family': verse.font,
            // Background is set in source view
            color: verse.foreground.toCSS(),
            transform:
                verse.tilt.toNumber() !== 0
                    ? `rotate(${verse.tilt.toNumber()}deg)`
                    : undefined,
        })}
        on:mousedown={(event) => interactive ? handleMouseDown(event) : null}
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
    >
        <div class="viewport">
            <!-- Render all visible phrases at their places, as well as any exiting phrases -->
            {#each visible as phrase}
                {@const place = places.get(phrase)}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                {#if place}
                    <PhraseView {phrase} {place} focus={verse.focus} />
                {:else}
                    <span>No place for Phrase, oops</span>
                {/if}
            {/each}
            {#each [...exiting] as [phrase, place]}
                <!-- There should always be a place. If there's not, there's something wrong with our layout algorithm. -->
                <PhraseView {phrase} {place} focus={verse.focus} />
            {/each}
        </div>
    </div>
{/if}

<style>
    .verse {
        width: 100%;
        height: 100%;
        position: relative;
        user-select: none;
    }

    .verse:focus {
        outline: none;
    }

    .ignored {
        animation: shake 0.25s 1;
    }

    .viewport {
        width: 100%;
        height: 100%;
        transform: translate(50%, 50%);
    }

    :global(.group.debug, .phrase.debug) {
        border: 1px dotted red;
    }

    .selected {
        filter: blur(var(--wordplay-focus-width))
    }

</style>
