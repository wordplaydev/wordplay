<svelte:options immutable={true} />

<script lang="ts">
    import { onMount, setContext } from 'svelte';
    import type Project from '../../models/Project';
    import type Verse from '@output/Verse';
    import {
        animatingNodes,
        playing,
        selectedOutput,
    } from '../../models/stores';
    import { preferredLanguages } from '@translation/translations';
    import { loadedFonts } from '../../native/Fonts';
    import { focusToTransform, PX_PER_METER, toCSS } from '@output/outputToCSS';
    import Place from '@output/Place';
    import { writable } from 'svelte/store';
    import Evaluate from '@nodes/Evaluate';
    import { DefaultFont, VerseType } from '@output/Verse';
    import Keyboard from '@input/Keyboard';
    import MousePosition from '@input/MousePosition';
    import MouseButton from '@input/MouseButton';
    import { createPlace } from '@output/Place';
    import Stage, { type OutputInfoSet } from '@output/Stage';
    import Decimal from 'decimal.js';
    import Pose from '@output/Pose';
    import GroupView from './GroupView.svelte';
    import { tick } from 'svelte';

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

    let mounted = false;
    onMount(() => (mounted = true));

    /** The list of visible phrases */
    let exiting: OutputInfoSet;

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = undefined;

    /** The creator or audience adjusted focus. Defaults backset. */
    let adjustedFocus: Place = createPlace(project.evaluator, 0, 0, 0, 0);

    /** The state of dragging the adjusted focus. A location or nothiing. */
    let focusDrag:
        | { startFocus: Place; left: number; top: number }
        | undefined = undefined;

    /** A stage to manage entries, exits, animations. A new one for each project. */
    let stage: Stage;
    $: {
        if (stage !== undefined) stage.stop();
        stage = new Stage(
            project,
            // When output exits, remove it from the map and triggering a render.
            (name) => {
                if (exiting.has(name)) {
                    exiting.delete(name);
                    exiting = new Map(exiting);
                }
            },
            // When the animating poses or sequences on stage change, update the store
            (nodes) => {
                if (interactive) animatingNodes.set(new Set(nodes));
            }
        );
    }

    /** Whenever the verse, languages, fonts, or rendered focus changes, update the rendered scene accordingly. */
    $: {
        const results = stage.update(
            verse,
            interactive,
            $preferredLanguages,
            $loadedFonts,
            renderedFocus,
            viewportWidth,
            viewportHeight
        );

        exiting = results.exiting;

        // Defer rendering until we have a view so that animations can be bound to DOM elements.
        tick().then(() => {
            results.animate();
        });
    }

    /** Decide what focus to render. Explicitly set verse focus takes priority, then the fit focus if fitting content to viewport,
     * then the adjusted focus if providedWhenever the verse focus, fit setting, or adjusted focus change, updated the rendered focus */
    $: renderedFocus = verse.place
        ? verse.place
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
        const context = stage.getRenderContext();
        if (view) {
            // Get the bounds of the verse in verse units.
            const contentBounds = verse.getBounds(context);
            const contentWidth = contentBounds.width;
            const contentHeight = contentBounds.height;

            // Convert them to screen units.
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

            // A bit of constraint solving to calculate the z necessary for achieving the scale computed above.
            const z =
                -(
                    (horizontal ? contentWidth : contentHeight) *
                    PX_PER_METER *
                    PX_PER_METER
                ) / (horizontal ? availableWidth : availableHeight);

            // Now focus the content on the center of the content.
            fitFocus = createPlace(
                project.evaluator,
                -(contentBounds.left + contentBounds.width / 2),
                -(contentBounds.top + contentBounds.height / 2),
                z,
                0
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
            project.evaluator
                .getNativeStreamsOfType(MouseButton)
                .map((stream) => stream.record(true));
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
            project.evaluator
                .getNativeStreamsOfType(MouseButton)
                .map((stream) => stream.record(false));
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
            project.evaluator
                .getNativeStreamsOfType(MousePosition)
                .map((stream) => stream.record(event.offsetX, event.offsetY));
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
            project.evaluator
                .getNativeStreamsOfType(Keyboard)
                .map((stream) => stream.record(event.key, false));
        } else ignore();
    }

    function adjustFocus(dx: number, dy: number, dz: number) {
        setFocus(
            renderedFocus.x.toNumber() + dx,
            renderedFocus.y.toNumber() + dy,
            renderedFocus.z.toNumber() + dz
        );
    }

    function setFocus(x: number, y: number, z: number) {
        // Set the new adjusted focus (updating the rendered focus, and thus the animator focus)
        adjustedFocus = createPlace(project.evaluator, x, y, z, 0);
        // Stop fitting
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

        // Record the key event on all keyboard streams if it wasn't handled above.
        if (project.evaluator.isPlaying()) {
            project.evaluator
                .getNativeStreamsOfType(Keyboard)
                .map((stream) => stream.record(event.key, true));
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

    $: center = new Place(
        verse.value,
        new Decimal(0),
        new Decimal(0),
        new Decimal(0),
        new Decimal(0)
    );
</script>

{#if mounted}
    {@const context = stage.getRenderContext()}
    <div
        class="verse {interactive && $playing ? '' : 'inert'} {ignored
            ? 'ignored'
            : ''}"
        data-id={verse.getHTMLID()}
        tabIndex={interactive ? 0 : null}
        style={toCSS({
            'font-family': verse.font ?? DefaultFont,
            background: verse.background.toCSS(),
            color:
                (verse.rest instanceof Pose
                    ? verse.rest.color?.toCSS()
                    : undefined) ?? 'var(--wordplay-foreground)',
        })}
        on:mousedown={(event) => (interactive ? handleMouseDown(event) : null)}
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:keydown={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        on:wheel={interactive ? handleWheel : null}
        bind:this={view}
    >
        <div
            class="viewport"
            class:changed
            style:transform={focusToTransform(viewportWidth, viewportHeight)}
        >
            <!-- Render the verse -->
            <GroupView
                group={verse}
                place={center}
                focus={renderedFocus}
                root
                {context}
                extra={exiting}
            />
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
