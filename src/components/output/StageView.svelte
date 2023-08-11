<svelte:options immutable={true} />

<script context="module" lang="ts">
    const HalfGridlineThickness = 0.1;
</script>

<script lang="ts">
    import { onDestroy, onMount } from 'svelte';
    import type Project from '@models/Project';
    import type Stage from '@output/Stage';
    import { loadedFonts } from '@basis/Fonts';
    import { PX_PER_METER, toCSS } from '@output/outputToCSS';
    import Place from '@output/Place';
    import Evaluate from '@nodes/Evaluate';
    import { DefaultFont, DefaultSize } from '@output/Stage';
    import { createPlace } from '@output/Place';
    import Scene, { type OutputInfoSet } from '@output/Scene';
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
        getEvaluation,
        getSelectedOutput,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import type TypeOutput from '../../output/TypeOutput';
    import Sequence from '../../output/Sequence';
    import Reference from '../../nodes/Reference';
    import { config } from '../../db/Database';

    export let project: Project;
    export let evaluator: Evaluator;
    export let stage: Stage;
    export let fullscreen: boolean;
    export let interactive: boolean;
    export let editable: boolean;
    export let fit: boolean;
    export let grid: boolean;
    export let painting: boolean;
    export let background: boolean;

    const selectedOutput = getSelectedOutput();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();

    const GRID_PADDING = 10;

    $: editing = $evaluation?.playing === false;

    let view: HTMLElement | null = null;

    let mounted = false;
    onMount(() => (mounted = true));

    /** The list of visible phrases */
    let exiting: OutputInfoSet;

    /** The list of entered phrases */
    let entered: Map<string, TypeOutput> = new Map();
    let present: Map<string, TypeOutput> = new Map();
    let previouslyPresent: Map<string, TypeOutput> | undefined = undefined;

    /** A description of phrases that have entered the scene */
    $: enteredDescription =
        entered.size > 0
            ? Array.from(entered.values())
                  .filter(
                      (output): output is Phrase => output instanceof Phrase
                  )
                  .map((output) => output.getDescription($config.getLocales()))
                  .join(', ')
            : '';

    /** A description of non-entering phrases that changed text */
    let changedDescription = '';
    $: {
        const changed: string[] = [];
        for (const [name, output] of present.entries()) {
            if (output instanceof Phrase) {
                const previous =
                    previouslyPresent === undefined
                        ? undefined
                        : previouslyPresent.get(name);
                if (!entered.has(name)) {
                    const previousText = previous
                        ?.getDescription($config.getLocales())
                        .toString();
                    const currentText = output
                        .getDescription($config.getLocales())
                        .toString();
                    if (
                        previousText !== currentText &&
                        typeof currentText === 'string'
                    ) {
                        const sequence =
                            output.resting instanceof Sequence
                                ? output.resting
                                : undefined;
                        const sequenceDescription = sequence
                            ? sequence.value.creator instanceof Evaluate &&
                              sequence.value.creator.inputs[0] instanceof
                                  Evaluate &&
                              sequence.value.creator.inputs[0].fun instanceof
                                  Reference
                                ? sequence.value.creator.inputs[0].fun.getName()
                                : ''
                            : undefined;
                        changed.push(
                            currentText +
                                (sequenceDescription
                                    ? ` ${sequenceDescription} animation`
                                    : '')
                        );
                    }
                }
            }
        }
        changedDescription = changed.length > 0 ? changed.join(', ') : '';
    }

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = undefined;

    /** The creator or audience adjusted focus. */
    let adjustedFocus: Place = createPlace(evaluator, 0, 0, -12);

    /** A stage to manage entries, exits, animations. A new one for each project. */
    let scene: Scene;
    $: {
        if (scene !== undefined) scene.stop();
        scene = new Scene(
            evaluator,
            // When output exits, remove it from the map and triggering a render.
            (name) => {
                if (exiting.has(name)) {
                    exiting.delete(name);
                    exiting = new Map(exiting);
                }
            },
            // When the animating poses or sequences on stage change, update the store
            (nodes) => {
                if (interactive && animatingNodes)
                    animatingNodes.set(new Set(nodes));
            }
        );
    }

    /** When this is unmounted, stop all animations.*/
    onDestroy(() => scene.stop());

    /** Expose the editable context to all children */
    let editableStore = writable<boolean>(editable);
    setContext('editable', editableStore);
    $: editableStore.set(editable);
    setContext('project', project);

    /** Whenever the verse, languages, fonts, or rendered focus changes, update the rendered scene accordingly. */
    $: {
        const results = scene.update(
            stage,
            interactive,
            renderedFocus,
            viewportWidth,
            viewportHeight,
            context
        );

        previouslyPresent = present;
        ({ exiting, present, entered } = results);

        // Defer rendering until we have a view so that animations can be bound to DOM elements.
        tick().then(() => {
            results.animate();
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

    $: context = new RenderContext(
        stage.font ?? DefaultFont,
        stage.size ?? DefaultSize,
        $config.getLocales(),
        $loadedFonts,
        $config.getAnimationFactor()
    );
    $: contentBounds = stage.getLayout(context);

    /** When verse or viewport changes, update the autofit focus. */
    $: {
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
                    PX_PER_METER
                ) / (horizontal ? availableWidth : availableHeight);

            // Now focus the content on the center of the content.
            fitFocus = createPlace(
                evaluator,
                -(contentBounds.left + contentBounds.width / 2),
                -contentBounds.top + contentBounds.height / 2,
                z
            );
            // If we're currently fitting to content, just make the adjusted focus the same in case the setting is inactive.
            // This ensures we start from where we left off.
            adjustedFocus = fitFocus;
        }
    }

    export const adjustFocus = (dx: number, dy: number, dz: number) => {
        setFocus(
            renderedFocus.x + dx,
            renderedFocus.y + dy,
            renderedFocus.z + dz
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
            : 'inert'} {project.main.names.getNames()[0]}"
        class:interactive
        class:changed
        class:selected={stage.value.creator instanceof Evaluate &&
            $selectedOutput &&
            $selectedOutput.includes(stage.value.creator)}
        class:editing={$evaluation?.playing === false && !painting}
        aria-label={stage.getDescription($config.getLocales())}
        data-id={stage.getHTMLID()}
        data-node-id={stage.value.creator.id}
        data-selectable={stage.selectable}
        style={toCSS({
            'font-family': `"${stage.font}", ${DefaultFont}`,
            background: background ? stage.background.toCSS() : undefined,
            '--grid-color': stage.background.complement().toCSS(),
            color:
                (
                    stage.getFirstRestPose()?.color ?? stage.pose.color
                )?.toCSS() ?? 'var(--wordplay-foreground)',
        })}
        bind:this={view}
    >
        <!-- Render the verse -->
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
        >
            {#if grid}
                {@const left = Math.min(
                    0,
                    Math.floor(contentBounds.left - GRID_PADDING)
                )}
                {@const right = Math.max(0, contentBounds.right + GRID_PADDING)}
                {@const bottom = Math.min(
                    0,
                    Math.floor(contentBounds.bottom - GRID_PADDING)
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
                    />
                {/if}
            {/each}
            <!-- Render screen reader live region when in full screen -->
            {#if fullscreen}
                <div
                    role="region"
                    class="output-changes"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-relevant="all"
                >
                    {#if enteredDescription.length > 0}
                        <p
                            >{$config.getLocale().term.entered}
                            {enteredDescription}</p
                        >
                    {/if}
                    {#if changedDescription.length > 0}
                        <p
                            >{$config.getLocale().term.changed}
                            {changedDescription}</p
                        >
                    {/if}
                </div>
            {/if}
        </GroupView>
    </section>
{/if}

<style>
    .interactor {
        width: 100%;
        height: 100%;
    }

    .stage {
        user-select: none;
        width: 100%;
        height: 100%;
        position: relative;

        --grid-color: currentColor;
    }

    .stage[data-selectable='true'] {
        cursor: pointer;
    }

    .stage:focus {
        outline: none;
    }

    .stage.editing.interactive.selected {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-highlight-color);
        outline-offset: calc(-3 * var(--wordplay-focus-width));
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
        height: 0.1px;
        border-top: 0.1px;
    }

    .vertical {
        width: 0.1px;
        border-left: 0.1px;
    }

    .axis {
        background-color: var(--grid-color);
        opacity: 0.4;
    }

    .output-changes {
        font-size: 0;
    }
</style>
