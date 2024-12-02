<script module lang="ts">
    const HalfGridlineThickness = 0.1;
</script>

<script lang="ts">
    import { onDestroy, onMount, untrack } from 'svelte';
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
    import { SvelteMap } from 'svelte/reactivity';

    interface Props {
        project: Project;
        evaluator: Evaluator;
        stage: Stage;
        interactive: boolean;
        editable: boolean;
        fit: boolean;
        grid: boolean;
        painting: boolean;
        background: boolean;
        /** Decide what focus to render. Explicitly set verse focus takes priority, then the fit focus if fitting content to viewport,
         * then the adjusted focus if providedWhenever the verse focus, fit setting, or adjusted focus change, updated the rendered focus */
        renderedFocus: Place;
    }

    let {
        project,
        evaluator,
        stage = $bindable(),
        interactive,
        editable,
        fit = $bindable(),
        grid = $bindable(),
        painting = $bindable(),
        background,
        renderedFocus = $bindable(),
    }: Props = $props();

    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();

    const GRID_PADDING = 10;

    let view: HTMLElement | null = $state(null);

    let mounted = $state(false);
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
    let stillTimeout: NodeJS.Timeout | undefined = $state(undefined);
    let lastAnnouncement = $state(0);
    // The last
    let frame = $state(0);
    const StillDuration = 1000;

    /** A set of all currently exiting outputs that need to be rendered in their last location. */
    let exiting: OutputInfoSet = $state(new Map());

    /** A set of output names recently removed, used to avoid adding exited outputs that were already exited by the animaator. */
    let recentlyExited = new Set<string>();

    let entered: Map<string, Output> = $state(new Map());
    let present: Map<string, Output> = $state(new Map());
    let moved: Moved = $state(new Map());
    let previouslyPresent: Map<string, Output> | undefined = $state(undefined);

    const announcer = getAnnounce();

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = $state(undefined);

    /** The creator or audience adjusted focus. */
    let adjustedFocus: Place = $state(createPlace(evaluator, 0, 0, -12));

    /** A stage to manage entries, exits, animations. A new one each time the for each project. */
    let animator = $state<Animator | undefined>();

    /** When this is unmounted, stop all animations.*/
    onDestroy(() => {
        if (animator) animator.stop();
        if (observer) observer.disconnect();
    });

    /** Keep track of the tile view's content window size for use in fitting content to the window */
    let parent: Element | null = $state(null);
    let observer: ResizeObserver | null = $state(null);
    let viewportWidth = $state(0);
    let viewportHeight = $state(0);
    let changed = $state(false);

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

    let editing = $derived($evaluation?.playing === false);

    // When interactive or stage changes, update the announcement timeout and timer.
    $effect(() => {
        if (interactive && stage) {
            untrack(() => {
                // Have we not announced in a while? Let's announce now.
                const now = Date.now();
                if (now - lastAnnouncement > StillDuration) {
                    frame++;
                    lastAnnouncement = now;
                }
                // Clear any timeout we had set up recently, then make a new one, announcing in a bit.
                if (stillTimeout) clearTimeout(stillTimeout);
                stillTimeout = setTimeout(() => {
                    frame++;
                    lastAnnouncement = Date.now();
                }, StillDuration);
            });
        }
    });

    function resetAnimator() {
        if (animator !== undefined) animator.stop();
        // Make a new one.
        animator = new Animator(
            evaluator,
            // When output exits, remove it from the map and triggering a render so that its removed from stage.
            (name) => {
                // Remember that we exited this name.
                recentlyExited.add(name);
                // Remove it from the exit set.
                if (exiting.has(name)) {
                    exiting.delete(name);
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

    // When the evaluator changes, stop the animator and create a new animator for the new evaluator.
    $effect(() => {
        evaluator;
        // Previous scene? Stop it.
        untrack(() => resetAnimator());
    });

    // Stop or When the evaluator is playing but the animator is stopped, create a new animator.
    $effect(() => {
        if (animator) {
            if ($evaluation.playing) {
                if (animator.isStopped()) untrack(() => resetAnimator());
            } else {
                animator.stop();
            }
        }
    });

    let context = $derived(
        new RenderContext(
            stage.face ?? $locales.getLocale().ui.font.app,
            stage.size ?? DefaultSize,
            project.getLocales(),
            $loadedFonts,
            $animationFactor,
        ),
    );
    let contentBounds = $derived(stage.getLayout(context));

    /** When verse or viewport changes, update the autofit focus. */
    $effect(() => {
        if (view && fit) {
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
            untrack(() => {
                if (fitFocus) adjustedFocus = fitFocus;
            });
        }
    });

    /** Define the rendered focused based on the stage's place, fit, and other states. Not derived since it is a bindable prop. */
    $effect(() => {
        renderedFocus = stage.place
            ? stage.place
            : fit && fitFocus && $evaluation?.playing === true
              ? fitFocus
              : adjustedFocus;
    });

    /** Whenever the stage, languages, fonts, or rendered focus changes, update the rendered scene accordingly. */
    $effect(() => {
        if (interactive && animator) {
            const results = animator.update(
                stage,
                interactive,
                renderedFocus,
                viewportWidth,
                viewportHeight,
                context,
            );

            // Ignore read of present output since we assign it below.
            untrack(() => {
                previouslyPresent = present;
                let animate: (() => void) | undefined = undefined;
                if (results !== undefined) {
                    ({ entered, present, moved, animate } = results);

                    // Get the list of newly exited phrases and add them to our set,
                    // unless they were recently removed.
                    const newExiting = new Map();
                    for (const [name, info] of results.exiting) {
                        if (!recentlyExited.has(name)) {
                            newExiting.set(name, info);
                        }
                    }
                    // Update the map of exiting outputs to render them to the view
                    exiting = new Map(newExiting);

                    // Reset the recently exited.
                    recentlyExited.clear();
                }

                // Defer animation initialization until we have a view so that animations can be bound to DOM elements.
                // Otherwise, animations will not have a DOM element to animate and will stop.
                tick().then(() => {
                    if (animate) animate();
                });
            });
        }
    });

    // Announce changes on stage.
    $effect(() => {
        if ($announcer) {
            const language = $locales.getLocale().language;

            if (entered.size > 0) {
                const enteredDescription =
                    describeEnteredOutput($locales, entered) ?? '';
                untrack(() =>
                    $announcer('entered', language, enteredDescription),
                );
            } else {
                const changeDescription = describedChangedOutput(
                    $locales,
                    entered,
                    present,
                    previouslyPresent,
                );
                if (changeDescription) {
                    untrack(() =>
                        $announcer('changed', language, changeDescription),
                    );
                } else if (moved.size > 0) {
                    const moveDescription = describeMovedOutput(
                        $locales,
                        moved,
                    );
                    untrack(() =>
                        $announcer('moved', language, moveDescription),
                    );
                }
            }
        }
    });

    let center = $derived(new Place(stage.value, 0, 0, 0));
    let offsetFocus = $derived(renderedFocus.offset(center));

    // When the viewport changes, update the observer to watch the new parent.
    $effect(() => {
        if (view)
            untrack(() => {
                if (view && view.parentElement && observer) {
                    if (parent !== view.parentElement) {
                        if (parent) observer.unobserve(parent);
                        parent = view.parentElement;
                        observer.observe(parent);
                    }
                }
            });
    });
</script>

{#if mounted}
    <section
        class="output stage {interactive && !editing ? 'live' : 'inert'}"
        class:interactive
        class:changed
        class:editing={$evaluation?.playing === false && !painting}
        aria-label={stage.description?.text ?? stage.getDescription($locales)}
        data-id={stage.getHTMLID()}
        data-node-id={stage.value.creator.id}
        data-selectable={stage.selectable}
        style:font-family={getFaceCSS(stage.face)}
        style:font-size={getSizeCSS(context.size)}
        style:background={background ? stage.back.toCSS() : null}
        style:color={getColorCSS(stage.getFirstRestPose(), stage.pose)}
        style:opacity={getOpacityCSS(stage.getFirstRestPose(), stage.pose)}
        style:--grid-color={stage.back.contrasting().toCSS()}
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
            {editable}
            {context}
            {interactive}
            {editing}
            {frame}
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
                    ></div>
                {/each}
                {#each range(bottom, top) as number}
                    <div
                        class="gridline horizontal"
                        style:top="{-number * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:left="{left * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:width="{Math.abs(left - right) * PX_PER_METER}px"
                    ></div>
                {/each}
                <div
                    class="gridline horizontal axis"
                    style:top="0px"
                    style:left="{left * PX_PER_METER - HalfGridlineThickness}px"
                    style:width="{Math.abs(left - right) * PX_PER_METER}px"
                ></div>
                <div
                    class="gridline vertical axis"
                    style:left="0px"
                    style:top="{-top * PX_PER_METER - HalfGridlineThickness}px"
                    style:height="{Math.abs(top - bottom) * PX_PER_METER}px"
                ></div>
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
                        {editable}
                        {editing}
                        {frame}
                    />
                {:else if info.output instanceof Group}
                    <GroupView
                        group={info.output}
                        place={info.global}
                        focus={offsetFocus}
                        parentAscent={0}
                        {interactive}
                        {context}
                        {editable}
                        {editing}
                        {frame}
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
</style>
