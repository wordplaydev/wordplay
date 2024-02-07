<script context="module" lang="ts">
    const HalfGridlineThickness = 0.1;
</script>

<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import type Project from '@models/Project';
    import type Stage from '@output/Stage';
    import { loadedFonts } from '@basis/Fonts';
    import {
        FOCAL_LENGTH,
        PX_PER_METER,
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
    } from '@output/outputToCSS';
    import Place from '@output/Place';
    import { DefaultSize } from '@output/Stage';
    import { createPlace } from '@output/Place';
    import Animator, { type Moved, type OutputInfoSet } from '@output/Animator';
    import GroupView from './GroupView.svelte';
    import { tick } from 'svelte';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import Group from '@output/Group';
    import range from '../../util/range';
    import RenderContext from '@output/RenderContext';
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import {
        getAnimatingNodes,
        getAnnounce,
        getEvaluation,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import type Output from '../../output/Output';
    import { animationFactor, locales } from '../../db/Database';
    import {
        describeEnteredOutput,
        describeMovedOutput,
        describedChangedOutput,
    } from './OutputDescriptions';

    export let project: Project;
    export let evaluator: Evaluator;
    export let stage: Stage;
    export let interactive: boolean;
    export let editable: boolean;
    export let fit: boolean;
    export let grid: boolean;
    export let painting: boolean;
    export let background: boolean;

    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();

    const GRID_PADDING = 10;

    $: editing = $evaluation?.playing === false;

    let view: HTMLElement | null = null;

    let mounted = false;
    onMount(() => {
        mounted = true;

        if (typeof ResizeObserver !== 'undefined')
            observer = new ResizeObserver((entries) => {
                const el = entries.at(0);
                if (el) {
                    let resized =
                        viewportWidth !== el.contentRect.width ||
                        viewportHeight !== el.contentRect.height;

                    if (resized) {
                        if (viewportWidth !== 0 && viewportHeight !== 0)
                            changed = true;
                        viewportWidth = el.contentRect.width;
                        viewportHeight = el.contentRect.height;

                        setTimeout(() => (changed = false), 250);
                    }
                }
            });

        /** Whenever a font finishes loading, re-render. */
        document.fonts.onloadingdone = () => {
            stage = stage;
        };
    });

    /**
     * Here we keep track of whether the stage has not been rerendered for some period of time.
     * We use this as an optimization, only generating expensive templated aria-labels for Group and Phrase views
     * when the screen is still, or when we haven't announced for a while. This is because screen reader users wouldn't be able to track something changing any faster,
     * since reading takes time.
     * We only do this if the stage is interactive. Otherwise, no descriptions.
     */
    let stillTimeout: NodeJS.Timeout | undefined = undefined;
    let lastAnnouncement = 0;
    let announce = false;
    $: if (interactive && stage) {
        // Start by assuming we're not going to announce.
        announce = false;
        // Have we not announced in a while? Let's announce now.
        const now = Date.now();
        if (now - lastAnnouncement > 1000) {
            announce = true;
            lastAnnouncement = now;
        }
        // Clear any timeout we had set up recently, then make a new one, announcing in a bit.
        if (stillTimeout) clearTimeout(stillTimeout);
        stillTimeout = setTimeout(() => {
            if (!announce) {
                announce = true;
            }
            lastAnnouncement = Date.now();
        }, 1000);
    }

    /** A set of all currently exiting outputs that need to be rendered in their last location. */
    let exiting: OutputInfoSet = new Map();

    let entered: Map<string, Output> = new Map();
    let present: Map<string, Output> = new Map();
    let moved: Moved = new Map();
    let previouslyPresent: Map<string, Output> | undefined = undefined;

    const announcer = getAnnounce();

    // Announce changes on stage.
    $: if ($announcer) {
        const language = $locales.getLocale().language;
        if (entered.size > 0)
            $announcer(
                'entered',
                language,
                describeEnteredOutput($locales, entered),
            );
        for (const change of describedChangedOutput(
            $locales,
            entered,
            present,
            previouslyPresent,
        ))
            $announcer('changed', language, change);
        if (moved.size > 0)
            $announcer('moved', language, describeMovedOutput($locales, moved));
    }

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = undefined;

    /** The creator or audience adjusted focus. */
    let adjustedFocus: Place = createPlace(evaluator, 0, 0, -12);

    /** A stage to manage entries, exits, animations. A new one each time the for each project. */
    let animator: Animator;
    $: {
        // Previous scene? Stop it.
        if (animator !== undefined) animator.stop();
        // Make a new one.
        animator = new Animator(
            evaluator,
            // When output exits, remove it from the map and triggering a render so that its removed from stage.
            (name) => {
                if (exiting.has(name)) {
                    exiting.delete(name);
                    // Update the set to force render
                    exiting = new Map(exiting);
                }
            },
            // When the animating poses or sequences on stage change, update the store
            (nodes) => {
                // Update the set of animated nodes.
                if (interactive && animatingNodes)
                    animatingNodes.set(new Set(nodes));
            },
        );
    }

    /** When this is unmounted, stop all animations.*/
    onDestroy(() => {
        animator.stop();
        if (observer) observer.disconnect();
    });

    /** Expose the editable context to all children */
    let editableStore = writable<boolean>(editable);
    setContext('editable', editableStore);
    $: editableStore.set(editable);
    setContext('project', project);

    /** Whenever the stage, languages, fonts, or rendered focus changes, update the rendered scene accordingly. */
    $: if (interactive) {
        const results = animator.update(
            stage,
            interactive,
            renderedFocus,
            viewportWidth,
            viewportHeight,
            context,
        );

        previouslyPresent = present;
        let animate: (() => void) | undefined = undefined;
        if (results !== undefined) {
            ({ entered, present, moved, animate } = results);

            // Get the list of newly exited phrases and add them to our set.
            for (const [key, val] of results.exiting) {
                exiting.set(key, val);
            }
            // Update the map of exiting outputs to render them to the view
            exiting = new Map(exiting);
        }

        // Defer animation initialization until we have a view so that animations can be bound to DOM elements.
        // Otherwise, animations will not have a DOM element to animate and will stop.
        tick().then(() => {
            if (animate) animate();
        });
    }

    /** Decide what focus to render. Explicitly set verse focus takes priority, then the fit focus if fitting content to viewport,
     * then the adjusted focus if providedWhenever the verse focus, fit setting, or adjusted focus change, updated the rendered focus */
    export let renderedFocus: Place;
    $: renderedFocus = stage.place
        ? stage.place
        : fit && fitFocus && $evaluation?.playing === true
          ? fitFocus
          : adjustedFocus;

    $: center = new Place(stage.value, 0, 0, 0);

    $: offsetFocus = renderedFocus.offset(center);

    /** Keep track of the tile view's content window size for use in fitting content to the window */
    let parent: Element | null;
    let observer: ResizeObserver | null = null;
    let viewportWidth = 0;
    let viewportHeight = 0;
    let changed = false;
    $: if (view && view.parentElement && observer) {
        if (parent !== view.parentElement) {
            if (parent) observer.unobserve(parent);
            parent = view.parentElement;
            observer.observe(parent);
        }
    }

    $: context = new RenderContext(
        stage.face ?? $locales.getLocale().ui.font.app,
        stage.size ?? DefaultSize,
        $locales,
        $loadedFonts,
        $animationFactor,
    );
    $: contentBounds = stage.getLayout(context);

    /** When verse or viewport changes, update the autofit focus. */
    $: if (view && fit) {
        // Get the bounds of the verse in verse units.
        const contentWidth = contentBounds.width;
        const contentHeight = contentBounds.height;

        // Convert them to screen units.
        const contentRenderedWidth = contentWidth * PX_PER_METER;
        const contentRenderedHeight = contentHeight * PX_PER_METER;

        // Leave some padding on the edges.
        const availableWidth = viewportWidth * (3 / 4);
        const availableHeight = viewportHeight * (3 / 4);

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
                FOCAL_LENGTH
            ) / (horizontal ? availableWidth : availableHeight);

        // Now focus the content on the center of the content.
        fitFocus = createPlace(
            evaluator,
            -(contentBounds.left + contentBounds.width / 2),
            contentBounds.top - contentBounds.height / 2,
            z,
        );
        // If we're currently fitting to content, just make the adjusted focus the same in case the setting is inactive.
        // This ensures we start from where we left off.
        adjustedFocus = fitFocus;
    }

    export const adjustFocus = (dx: number, dy: number, dz: number) => {
        setFocus(
            renderedFocus.x + dx,
            renderedFocus.y + dy,
            renderedFocus.z + dz,
        );
    };

    export const setFocus = (x: number, y: number, z: number) => {
        // Set the new adjusted focus (updating the rendered focus, and thus the animator focus)
        adjustedFocus = createPlace(evaluator, x, y, z);
        // Stop fitting
        fit = false;
    };
</script>

{#if mounted}
    <section
        class="output stage {interactive && !editing
            ? 'live'
            : 'inert'} {project.getMain().names.getNames()[0]}"
        class:interactive
        class:changed
        class:editing={$evaluation?.playing === false && !painting}
        aria-label={stage.getDescription($locales)}
        data-id={stage.getHTMLID()}
        data-node-id={stage.value.creator.id}
        data-selectable={stage.selectable}
        style:font-family={getFaceCSS(stage.face)}
        style:font-size={getSizeCSS(context.size)}
        style:background={background ? stage.back.toCSS() : null}
        style:color={getColorCSS(stage.getFirstRestPose(), stage.pose)}
        style:opacity={getOpacityCSS(stage.getFirstRestPose(), stage.pose)}
        style:--grid-color={stage.back.complement().toCSS()}
        bind:this={view}
    >
        <!-- Render the stage -->
        <GroupView
            group={stage}
            place={center}
            focus={renderedFocus}
            viewport={{ width: viewportWidth, height: viewportHeight }}
            clip={stage.frame}
            parentAscent={0}
            {context}
            {interactive}
            {editing}
            still={announce}
        >
            {#if grid}
                {@const left = Math.min(
                    0,
                    Math.floor(contentBounds.left - GRID_PADDING),
                )}
                {@const right = Math.max(0, contentBounds.right + GRID_PADDING)}
                {@const bottom = Math.min(
                    0,
                    Math.floor(contentBounds.bottom - GRID_PADDING),
                )}
                {@const top = Math.max(0, contentBounds.top + GRID_PADDING)}
                <!-- Render a grid if this is the root and the grid is on. Apply the same transform that we do the the verse. -->
                {#each range(left, right) as number}
                    <div
                        class="gridline vertical"
                        style:left="{number * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:top="{-top * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:height="{Math.abs(top - bottom) * PX_PER_METER}px"
                    />
                {/each}
                {#each range(bottom, top) as number}
                    <div
                        class="gridline horizontal"
                        style:top="{-number * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:left="{left * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:width="{Math.abs(left - right) * PX_PER_METER}px"
                    />
                {/each}
                <div
                    class="gridline horizontal axis"
                    style:top="0px"
                    style:left="{left * PX_PER_METER - HalfGridlineThickness}px"
                    style:width="{Math.abs(left - right) * PX_PER_METER}px"
                />
                <div
                    class="gridline vertical axis"
                    style:left="0px"
                    style:top="{-top * PX_PER_METER - HalfGridlineThickness}px"
                    style:height="{Math.abs(top - bottom) * PX_PER_METER}px"
                />
            {/if}
            <!-- Render exiting nodes -->
            {#each Array.from(exiting.entries()) as [name, info] (name)}
                {#if info.output instanceof Phrase}
                    <PhraseView
                        phrase={info.output}
                        place={info.global}
                        focus={offsetFocus}
                        {interactive}
                        parentAscent={0}
                        {context}
                        {editing}
                        still={announce}
                    />
                {:else if info.output instanceof Group}
                    <GroupView
                        group={info.output}
                        place={info.global}
                        focus={offsetFocus}
                        parentAscent={0}
                        {interactive}
                        {context}
                        {editing}
                        still={announce}
                    />
                {/if}
            {/each}
        </GroupView>
    </section>
{/if}

<style>
    .stage {
        user-select: none;
        position: relative;
        flex-grow: 1;

        color: var(--wordplay-foreground);

        --grid-color: currentColor;

        /** Put the stage in a layer, since it's contents likely change frequently. */
        will-change: contents;

        /** No touch actions on the stage, since we handle them ourselves. */
        touch-action: none;
    }

    .stage[data-selectable='true'] {
        cursor: pointer;
    }

    .stage:focus {
        outline: none;
    }

    .stage {
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .stage.changed {
        transition: none;
    }

    .grid {
        position: relative;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    .gridline {
        position: absolute;
        border-style: solid;
        border: none;
        opacity: 0.2;
        background-color: var(--grid-color);
    }

    .horizontal {
        height: 3px;
        border-top: 1px;
    }

    .vertical {
        width: 3px;
        border-left: 1px;
    }

    .axis {
        background-color: var(--grid-color);
        opacity: 0.4;
    }

    .rectangle-barrier {
        position: absolute;
        background: var(--wordplay-inactive-color);
        border-radius: calc(var(--wordplay-border-radius) * 2);
    }
</style>
