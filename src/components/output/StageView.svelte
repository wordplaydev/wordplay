<script module lang="ts">
    const HalfGridlineThickness = 0.1;
</script>

<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
    import { fontsLoadedGeneration, loadedFonts } from '@basis/faces/Fonts';
    import type Project from '@db/projects/Project';
    import Animator, { type Moved, type OutputInfoSet } from '@output/Animator';
    import Group from '@output/Group';
    import {
        FOCAL_LENGTH,
        PX_PER_METER,
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
    } from '@output/outputToCSS';
    import Phrase from '@output/Phrase';
    import Place, { createPlace } from '@output/Place';
    import RenderContext from '@output/RenderContext';
    import type Stage from '@output/Stage';
    import { DefaultSize, toOverlayStage } from '@output/Stage';
    import type Evaluator from '@runtime/Evaluator';
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { animationFactor, locales, writingLayout } from '@db/Database';
    import type Output from '@output/Output';
    import range from '@util/range';
    import {
        getAnimatingNodes,
        getAnnouncer,
        getEvaluation,
        getSelectedOutput,
    } from '@components/project/Contexts';
    import GroupView from '@components/output/GroupView.svelte';
    import {
        describeEnteredOutput,
        describeMovedOutput,
        describedChangedOutput,
    } from '@components/output/OutputDescriptions';
    import PhraseView from '@components/output/PhraseView.svelte';

    interface Props {
        project: Project;
        evaluator: Evaluator;
        stage: Stage;
        interactive: boolean;
        editable: boolean;
        /** Whether the creator can select output for inspection (edit or step mode).
         * Defaults to editable, so read-only stages behave as before. */
        inspectable?: boolean;
        fit: boolean;
        grid: boolean;
        painting: boolean;
        background: boolean;
        /** Decide what focus to render. Explicitly set verse focus takes priority, then the fit focus if fitting content to viewport,
         * then the adjusted focus if providedWhenever the verse focus, fit setting, or adjusted focus change, updated the rendered focus */
        renderedFocus: Place;
        /** Reflects whether the audience has overridden the stage's place via zoom/pan controls. */
        focusOverridden?: boolean;
    }

    let {
        project,
        evaluator,
        stage = $bindable(),
        interactive,
        editable,
        inspectable = editable,
        fit = $bindable(),
        grid = $bindable(),
        painting = $bindable(),
        background,
        renderedFocus = $bindable(),
        focusOverridden = $bindable(false),
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

    const announcer = getAnnouncer();
    const selectedOutput = getSelectedOutput();

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = $state(undefined);

    /** The creator or audience adjusted focus. */
    let adjustedFocus: Place = $state(createPlace(evaluator, 0, 0, -12));

    /** Whether the audience has overridden the stage's place via zoom/pan controls. */
    let focusOverride = $state(false);

    /** A stage to manage entries, exits, animations. A new one each time the for each project. */
    let animator = $state<Animator | undefined>();

    /** A second animator for the flat overlay/HUD layer (stage.overlay), driven
     *  with a constant screen-centered focus so it never pans with the camera. */
    let overlayAnimator = $state<Animator | undefined>();
    let overlayExiting: OutputInfoSet = $state(new Map());
    let overlayRecentlyExited = new Set<string>();
    /** The overlay content wrapped as a synthetic Stage, or undefined if none. */
    let overlayStage = $derived(
        toOverlayStage(stage, $locales.getLocale().ui.font.app),
    );
    /** A constant, screen-centered focus for the flat overlay layer. */
    let hudFocus = $derived(createPlace(evaluator, 0, 0, 0));

    /** When this is unmounted, stop all animations.*/
    onDestroy(() => {
        if (animator) animator.stop();
        if (overlayAnimator) overlayAnimator.stop();
        if (observer) observer.disconnect();
        if (focusRAF !== undefined && typeof cancelAnimationFrame !== 'undefined')
            cancelAnimationFrame(focusRAF);
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
        // The audience has taken control of the focus; override any stage.place.
        focusOverride = true;
    };

    /** Clear any audience override so the stage's computed focus is used again. */
    export const resetFocus = () => {
        focusOverride = false;
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

        // A second, flat animator for the overlay/HUD layer.
        if (overlayAnimator !== undefined) overlayAnimator.stop();
        overlayAnimator = new Animator(
            evaluator,
            (name) => {
                overlayRecentlyExited.add(name);
                if (overlayExiting.has(name)) {
                    overlayExiting.delete(name);
                    overlayExiting = new Map(overlayExiting);
                }
            },
            () => {},
            true,
        );
    }

    // When the evaluator changes, stop the animator and create a new animator for the new evaluator.
    $effect(() => {
        evaluator;
        // Previous scene? Stop it.
        untrack(() => resetAnimator());
    });

    // When the evaluator is playing but the animator is stopped, create a new animator.
    $effect(() => {
        if (animator) {
            // If there's an evaluation context, adjust the animator state based on it.
            if ($evaluation) {
                if ($evaluation.playing) {
                    if (animator.isStopped()) untrack(() => resetAnimator());
                } else {
                    animator.stop();
                    overlayAnimator?.stop();
                }
            }
        }
    });

    // The effective writing layout for output: an explicit setting, or the
    // project locale's layout when the setting is 'auto'.
    let outputLayout = $derived(
        $writingLayout === 'auto'
            ? project.getLocales().getLayout()
            : $writingLayout,
    );
    let context = $derived.by(() => {
        // Depend on the font-load generation so text re-measures when
        // lazily-loaded faces arrive (default/preloaded faces never touch
        // the $loadedFonts store, so this is the signal that catches them).
        $fontsLoadedGeneration;
        return new RenderContext(
            stage.face ?? $locales.getLocale().ui.font.app,
            stage.size ?? DefaultSize,
            project.getLocales(),
            $loadedFonts,
            $animationFactor,
            outputLayout,
        );
    });
    let contentBounds = $derived(stage.getLayout(context));

    /** Permanently disable autofit when the user starts a palette edit, so the
     *  stage doesn't snap back to fit after the gesture ends. */
    $effect(() => {
        if (selectedOutput?.adjusting)
            untrack(() => {
                fit = false;
            });
    });

    /** When verse or viewport changes, update the autofit focus. */
    $effect(() => {
        if (view && fit && !selectedOutput?.adjusting) {
            // Get the bounds of the verse in verse units.
            const contentWidth = contentBounds.width;
            const contentHeight = contentBounds.height;

            // Convert them to screen units.
            const contentRenderedWidth = contentWidth * PX_PER_METER;
            const contentRenderedHeight = contentHeight * PX_PER_METER;

            // Leave some padding on the edges.
            const availableWidth = viewportWidth * (3 / 4);
            const availableHeight = viewportHeight * (3 / 4);

            // Skip if viewport dimensions aren't known yet; dividing by zero produces z = -Infinity
            // which causes rootScale() to return 0 and renders all content invisible.
            if (availableWidth <= 0 || availableHeight <= 0) return;

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

    /** Turning fitting back on is the audience handing the camera back, so it
     *  clears any pan/zoom override. There are only two states worth having:
     *  the audience drives the camera, or the platform does — and when the
     *  platform does, a stage @Place from the program wins over fitting. Without
     *  this, a zoom's override outlived the gesture: re-locking would fit the
     *  content once and then keep ignoring a moving stage.place forever. */
    $effect(() => {
        if (fit) focusOverride = false;
    });

    /** The focus the stage wants right now, computed instantly from the stage's
     *  place, fit, and override states. The rendered focus eases toward this. */
    let targetFocus = $derived(
        focusOverride
            ? adjustedFocus
            : stage.place
              ? stage.place.flipX()
              : fit && fitFocus && $evaluation?.playing === true
                ? fitFocus
                : adjustedFocus,
    );

    /** Ease the camera toward the target over the stage's duration, so a moving
     *  stage.place pans smoothly instead of snapping — matching how every other
     *  output animates its place change. We only ease the creator-set camera
     *  while playing; audience pan/zoom and fit stay instant so dragging and
     *  layout changes remain responsive. */
    let easeFocus = $derived(
        stage.place !== undefined &&
            !focusOverride &&
            $evaluation?.playing === true,
    );

    let focusRAF: number | undefined = undefined;
    let lastFocusFrame: number | undefined = undefined;
    let focusStarted = false;

    function stepFocus() {
        focusRAF = undefined;
        const target = targetFocus;
        const duration = (stage.duration ?? 0) * $animationFactor;
        if (!easeFocus || duration <= 0) {
            lastFocusFrame = undefined;
            renderedFocus = target;
            return;
        }
        const now = performance.now();
        const dt =
            lastFocusFrame === undefined ? 0 : (now - lastFocusFrame) / 1000;
        lastFocusFrame = now;
        // Exponential approach: ~99% of the way there after `duration` seconds,
        // frame-rate independent, with a natural decelerating (ease-out) feel.
        const alpha = dt <= 0 ? 0 : 1 - Math.exp((-5 * dt) / duration);
        const nx = renderedFocus.x + (target.x - renderedFocus.x) * alpha;
        const ny = renderedFocus.y + (target.y - renderedFocus.y) * alpha;
        const nz = renderedFocus.z + (target.z - renderedFocus.z) * alpha;
        // Landed on every axis? Snap exactly and stop the loop.
        if (
            Math.abs(target.x - nx) < 0.001 &&
            Math.abs(target.y - ny) < 0.001 &&
            Math.abs(target.z - nz) < 0.001
        ) {
            lastFocusFrame = undefined;
            renderedFocus = target;
            return;
        }
        renderedFocus = createPlace(evaluator, nx, ny, nz);
        focusRAF = requestAnimationFrame(stepFocus);
    }

    /** When the target focus or ease conditions change, snap or kick the ease
     *  loop. First render, non-easing states, and non-browser contexts (no
     *  requestAnimationFrame, e.g. tests/SSR) snap instantly to preserve the
     *  prior behavior. */
    $effect(() => {
        const target = targetFocus;
        const ease = easeFocus;
        const canAnimate = typeof requestAnimationFrame !== 'undefined';
        if (!focusStarted || !ease || !canAnimate) {
            focusStarted = true;
            lastFocusFrame = undefined;
            renderedFocus = target;
            return;
        }
        if (focusRAF === undefined) focusRAF = requestAnimationFrame(stepFocus);
    });

    /** Mirror the override flag out to the parent so the toolbar can reflect it. */
    $effect(() => {
        focusOverridden = focusOverride;
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

    /** Update the flat overlay/HUD layer's scene whenever its content or the
     *  viewport changes. Uses a constant screen-centered focus so it never pans
     *  with the camera. */
    $effect(() => {
        if (interactive && overlayAnimator && overlayStage) {
            const results = overlayAnimator.update(
                overlayStage,
                interactive,
                hudFocus,
                viewportWidth,
                viewportHeight,
                context,
            );
            untrack(() => {
                let animate: (() => void) | undefined = undefined;
                if (results !== undefined) {
                    animate = results.animate;
                    const newExiting = new Map();
                    for (const [name, info] of results.exiting) {
                        if (!overlayRecentlyExited.has(name))
                            newExiting.set(name, info);
                    }
                    overlayExiting = new Map(newExiting);
                    overlayRecentlyExited.clear();
                }
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
        class:editing={$evaluation?.playing === false &&
            !painting &&
            inspectable}
        aria-label={stage.description?.text ?? stage.getDescription($locales)}
        data-id={stage.getHTMLID()}
        // Only add a node ID if a stage value created it. Stages are implicitly created when the project evalutes to just a phrase
        // but we don't want this to be associated with that phrase for the puroposes of interactivity.
        data-node-id={stage.explicit ? stage.value.creator.id : undefined}
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
            {inspectable}
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
                    {@const left =
                        number * PX_PER_METER - HalfGridlineThickness}
                    <div
                        class="gridline vertical"
                        style:left="{left}px"
                        style:top="{-top * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:height="{Math.abs(top - bottom) * PX_PER_METER}px"
                    ></div>
                    {#if number !== 0}
                        <div class="coordinate vertical" style:left="{left}px"
                            >{number}m</div
                        >
                    {/if}
                {/each}
                {#each range(bottom, top) as number}
                    {@const top =
                        -number * PX_PER_METER - HalfGridlineThickness}
                    <div
                        class="gridline horizontal"
                        style:top="{top}px"
                        style:left="{left * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:width="{Math.abs(left - right) * PX_PER_METER}px"
                    ></div>
                    <div class="coordinate horizontal" style:top="{top}px"
                        >{number}m</div
                    >
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
                        {inspectable}
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
                        {inspectable}
                        {editing}
                        {frame}
                    />
                {/if}
            {/each}
        </GroupView>
        {#if overlayStage}
            <!-- The flat overlay/HUD layer: its own .stage.live container (so
                 its animations resolve to a distinct DOM scope), pinned over the
                 world content and rendered flat (screen-fixed, no camera/z). -->
            <section
                class="stage overlay-layer {interactive && !editing
                    ? 'live'
                    : 'inert'}"
                data-id={overlayStage.getHTMLID()}
                aria-hidden="true"
            >
                <GroupView
                    group={overlayStage}
                    place={center}
                    focus={hudFocus}
                    viewport={{ width: viewportWidth, height: viewportHeight }}
                    parentAscent={0}
                    {editable}
                    {inspectable}
                    {context}
                    {interactive}
                    {editing}
                    {frame}
                    flat={true}
                >
                    {#each Array.from(overlayExiting.entries()) as [name, info] (name)}
                        {#if info.output instanceof Phrase}
                            <PhraseView
                                phrase={info.output}
                                place={info.global}
                                focus={hudFocus}
                                {interactive}
                                parentAscent={0}
                                {context}
                                {editable}
                                {inspectable}
                                {editing}
                                {frame}
                                flat={true}
                            />
                        {:else if info.output instanceof Group}
                            <GroupView
                                group={info.output}
                                place={info.global}
                                focus={hudFocus}
                                parentAscent={0}
                                {interactive}
                                {context}
                                {editable}
                                {inspectable}
                                {editing}
                                {frame}
                                flat={true}
                            />
                        {/if}
                    {/each}
                </GroupView>
            </section>
        {/if}
    </section>
{/if}

<style>
    .overlay-layer {
        position: absolute;
        inset: 0;
        /* Pin over the world content, but let clicks fall through to it;
           selectable HUD children re-enable pointer events themselves. */
        pointer-events: none;
        background: none;
        z-index: 10;
        flex-grow: 0;
    }

    .stage {
        user-select: none;
        position: relative;
        flex-grow: 1;

        /* Keep stages a stable light canvas even when rendered outside OutputView
           (e.g. project previews), so the fallbacks below resolve light and don't
           invert under a dark UI. */
        color-scheme: light;
        color: var(--wordplay-foreground);

        --grid-color: currentColor;

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

    .coordinate {
        position: absolute;
        font-size: 0.25em;
        color: var(--grid-color);
        opacity: 0.5;
        pointer-events: none;
    }

    .coordinate.horizontal {
        transform: translate(25%, -50%);
    }

    .coordinate.vertical {
        transform: translate(50%, 0%);
    }

    .axis {
        background-color: var(--grid-color);
        opacity: 0.5;
    }
</style>
