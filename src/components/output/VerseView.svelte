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
    export let fit: boolean;

    let ignored = false;
    let view: HTMLElement | null = null;

    let editableStore = writable<boolean>(editable);
    setContext('editable', editableStore);
    $: editableStore.set(editable);

    // Set the animations context for everything in the verse.
    setContext('animations', project.evaluator.animations);

    let mounted = false;
    onMount(() => (mounted = true));

    /** The list of visible phrases */
    let visible: Phrase[] = [];

    /** The location of all phrases, post layout */
    let places = new Map<Group, Place>();

    /** Phrases that have left the scene but are still animating their exit */
    let exiting: Map<Phrase, Place> = new Map();

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = undefined;

    /** The creator or audience adjusted focus */
    let adjustedFocus: Place = project.evaluator.animations.getFocus();

    /** The state of dragging the adjusted focus. A location or nothiing. */
    let focusDrag:
        | { startFocus: Place; left: number; top: number }
        | undefined = undefined;

    /** Whenever the verse, languages, fonts, or rendered focus changes, update the rendered scene. */
    $: ({ places, visible, exiting } = project.evaluator.animations.update(
        verse,
        $preferredLanguages,
        $loadedFonts,
        renderedFocus,
        viewportWidth,
        viewportHeight
    ));

    /** Whenever the verse focus, fit setting, or adjusted focus change, updated the rendered focus */
    $: renderedFocus = verse.focus
        ? verse.focus
        : fit && fitFocus
        ? fitFocus
        : adjustedFocus;

    /** Keep track of the tile view's content window size for use in fitting content to the window */
    let parent: Element | null;
    let observer: ResizeObserver | undefined;
    let viewportWidth: number = 0;
    let viewportHeight: number = 0;
    let changed: boolean = false;
    $: {
        if (observer && parent) observer.unobserve(parent);
        if (view && view.parentElement) {
            parent = view.parentElement;
            observer = new ResizeObserver((entries) => {
                const el = entries.at(0);
                if (el) {
                    changed =
                        viewportWidth !== el.contentRect.width ||
                        viewportHeight !== el.contentRect.height;
                    viewportWidth = el.contentRect.width;
                    viewportHeight = el.contentRect.height;

                    if (changed) setTimeout(() => (changed = false), 250);
                }
            });
            observer.observe(parent);
        }
    }

    /** When verse or viewport changes, update the autofit focus. */
    $: {
        const context = project.evaluator.animations.getRenderContext();
        if (view) {
            // Get the bounds of the verse in verse units.
            const contentBounds = verse.getBounds(context);
            const contentWidth = contentBounds.width;
            const contentHeight = contentBounds.height;

            // Conver them to screen units.
            const contentRenderedWidth = contentWidth * PX_PER_METER;
            const contentRenderedHeight = contentHeight * PX_PER_METER;

            // Leave some padding on the edges.
            const availableWidth = viewportWidth * (2 / 3);
            const availableHeight = viewportHeight * (2 / 3);

            // Figure out the fit dimension based on which scale would be smaller.
            // This ensures that we don't clip anything.
            const horizontal =
                availableWidth / contentRenderedWidth <
                availableHeight / contentRenderedHeight;

            // Adjust the x so that everything fits inside.

            // This is is a bit of constraint solving to calculate the z necessary for achieving the scale computed above.
            const z =
                -(
                    (horizontal ? contentWidth : contentHeight) *
                    PX_PER_METER *
                    PX_PER_METER
                ) / (horizontal ? availableWidth : availableHeight);

            // Now focus the content on the center of the content.
            fitFocus = project.evaluator.animations.createPlace(
                -(contentBounds.left + contentBounds.width / 2),
                -(contentBounds.top + contentBounds.height / 2),
                z
            );
            // If we're currently fitting to content, just make the adjusted focus the same in case the setting is disabled.
            // This ensures we start from where we left off.
            if (fit) adjustedFocus = fitFocus;
        }
    }

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), 250);
    }

    function handleMouseDown(event: MouseEvent) {
        // Focus the view if not focused.
        view?.focus();

        // Start dragging to move the focus
        if (view && event.shiftKey) {
            const rect = view.getBoundingClientRect();

            focusDrag = {
                startFocus: renderedFocus,
                left: event.clientX - rect.left,
                top: event.clientY - rect.top,
            };
            event.stopPropagation();
        }

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
        // If dragging the focus, stop
        if (focusDrag) focusDrag = undefined;

        if (project.evaluator.isPlaying())
            project.streams.mouseButton.record(false);
        else ignore();
    }

    function handleMouseMove(event: MouseEvent) {
        // If dragging the focus, adjust it accordingly.
        if (event.buttons === 1 && focusDrag && view && event.shiftKey) {
            event.stopPropagation();
            const rect = view.getBoundingClientRect();
            const deltaX = event.clientX - rect.left - focusDrag.left;
            const deltaY = event.clientY - rect.top - focusDrag.top;

            const scale = PX_PER_METER;

            setFocus(
                focusDrag.startFocus.x.toNumber() + deltaX / scale,
                focusDrag.startFocus.y.toNumber() + deltaY / scale,
                focusDrag.startFocus.z.toNumber()
            );
        }

        if (project.evaluator.isPlaying())
            project.streams.mousePosition.record(event.offsetX, event.offsetY);
        // Don't give feedback on this; it's not expected.
    }

    function handleWheel(event: WheelEvent) {
        adjustFocus(0, 0, event.deltaY / Math.pow(PX_PER_METER, 2));
        event.preventDefault();
    }

    function handleKeyUp(event: KeyboardEvent) {
        // Never handle tab; that's for keyboard navigation.
        if (event.key === 'Tab') return;

        // If dragging the focus, stop
        if (focusDrag) focusDrag = undefined;

        if (project.evaluator.isPlaying()) {
            project.streams.keyboard.record(event.key, false);
        } else ignore();
    }

    function adjustFocus(dx: number, dy: number, dz: number) {
        adjustedFocus = project.evaluator.animations.adjustFocus(
            renderedFocus,
            dx,
            dy,
            dz
        );
        fit = false;
    }

    function setFocus(x: number, y: number, z: number) {
        adjustedFocus = project.evaluator.animations.setFocus(x, y, z);
        fit = false;
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Never handle tab; that's for focus navigation.
        if (event.key === 'Tab') return;

        // Adjust focus
        if (event.shiftKey) {
            const increment = 1;
            if (event.key === 'ArrowLeft') {
                return adjustFocus(-1 * increment, 0, 0);
            } else if (event.key === 'ArrowRight') {
                return adjustFocus(increment, 0, 0);
            } else if (event.key === 'ArrowUp') {
                return adjustFocus(0, -1 * increment, 0);
            } else if (event.key === 'ArrowDown') {
                return adjustFocus(0, increment, 0);
            } else if (event.key === '+') {
                return adjustFocus(0, 0, 1);
            } else if (event.key === '_') {
                return adjustFocus(0, 0, -1);
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
        })}
        on:mousedown={(event) => (interactive ? handleMouseDown(event) : null)}
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        on:wheel={interactive ? handleWheel : null}
        bind:this={view}
    >
        <!-- 

            style:transform={` scale(${Math.abs(
                PX_PER_METER / renderedFocus.z.toNumber()
            )}) translate(${PX_PER_METER * renderedFocus.x.toNumber()}px, ${
                PX_PER_METER * renderedFocus.y.toNumber()
            }px) ${
                verse.tilt.toNumber() !== 0
                    ? `rotate(${verse.tilt.toNumber()}deg)`
                    : ''
            }`}
     -->
        <div class="viewport" class:changed>
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
                        focus={renderedFocus}
                        viewport={{
                            width: viewportWidth,
                            height: viewportHeight,
                        }}
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
                    focus={renderedFocus}
                    viewport={{ width: viewportWidth, height: viewportHeight }}
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
        position: relative;
    }

    .verse:focus {
        outline: none;
    }

    .viewport {
        width: 100%;
        height: 100%;
        transition: transform 0.25s ease-out;
    }

    .viewport.changed {
        transition: none;
    }

    .ignored {
        animation: shake 0.1s 1;
    }

    :global(.group.debug, .phrase.debug) {
        border: 1px dotted red;
    }
</style>
