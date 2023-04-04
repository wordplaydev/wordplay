<svelte:options immutable={true} />

<script lang="ts">
    import { afterUpdate, beforeUpdate, onDestroy, onMount } from 'svelte';
    import type Project from '@models/Project';
    import type Verse from '@output/Verse';
    import { animationsOn } from '@models/stores';
    import { preferredLanguages } from '@translation/translations';
    import { loadedFonts } from '@native/Fonts';
    import { centerTransform, PX_PER_METER, toCSS } from '@output/outputToCSS';
    import Place from '@output/Place';
    import Evaluate from '@nodes/Evaluate';
    import { DefaultFont, DefaultSize, VerseType } from '@output/Verse';
    import Keyboard from '@input/Keyboard';
    import MousePosition from '@input/MousePosition';
    import MouseButton from '@input/MouseButton';
    import { createPlace } from '@output/Place';
    import Stage, { type OutputInfoSet } from '@output/Stage';
    import Pose from '@output/Pose';
    import GroupView from './GroupView.svelte';
    import { tick } from 'svelte';
    import Phrase from '@output/Phrase';
    import PhraseView from './PhraseView.svelte';
    import Group from '@output/Group';
    import range from '../../util/range';
    import RenderContext from '@output/RenderContext';
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import moveOutput from '../palette/moveOutput';
    import {
        getAnimatingNodes,
        getEvaluation,
        getProjects,
        getSelectedOutput,
        getSelectedOutputPaths,
        getSelectedPhrase,
        setSelectedOutput,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import Selection from '../../input/Choice';
    import { DOMRectCenter, DOMRectDistance } from './utilities';

    export let project: Project;
    export let evaluator: Evaluator;
    export let verse: Verse;
    export let fullscreen: boolean;
    export let interactive: boolean;
    export let editable: boolean;
    export let fit: boolean;
    export let grid: boolean;

    const projects = getProjects();
    const selectedOutput = getSelectedOutput();
    const selectedOutputPaths = getSelectedOutputPaths();
    const selectedPhrase = getSelectedPhrase();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();

    const GRID_PADDING = 10;

    $: editing = $evaluation?.playing === false;

    let ignored = false;
    let view: HTMLElement | null = null;

    let mounted = false;
    onMount(() => (mounted = true));

    /** The list of visible phrases */
    let exiting: OutputInfoSet;

    /** The verse focus that fits the content to the view*/
    let fitFocus: Place | undefined = undefined;

    /** The creator or audience adjusted focus. */
    let adjustedFocus: Place = createPlace(evaluator, 0, 0, -12, 0);

    /** The state of dragging the adjusted focus. A location or nothing. */
    let focusDrag:
        | { startFocus: Place; left: number; top: number }
        | undefined = undefined;

    /** A stage to manage entries, exits, animations. A new one for each project. */
    let stage: Stage;
    $: {
        if (stage !== undefined) stage.stop();
        stage = new Stage(
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
    onDestroy(() => stage.stop());

    /** Expose the editable context to all children */
    let editableStore = writable<boolean>(editable);
    setContext('editable', editableStore);
    $: editableStore.set(editable);
    setContext('project', project);

    /** Whenever the verse, languages, fonts, or rendered focus changes, update the rendered scene accordingly. */
    $: {
        const results = stage.update(
            verse,
            interactive,
            renderedFocus,
            viewportWidth,
            viewportHeight,
            context
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
        : fit && fitFocus && $evaluation?.playing === true
        ? fitFocus
        : adjustedFocus;

    $: center = new Place(verse.value, 0, 0, 0);

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
        verse.font ?? DefaultFont,
        verse.size ?? DefaultSize,
        $preferredLanguages,
        $loadedFonts,
        $animationsOn
    );
    $: contentBounds = verse.getBounds(context);

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
                z,
                0
            );
            // If we're currently fitting to content, just make the adjusted focus the same in case the setting is disabled.
            // This ensures we start from where we left off.
            adjustedFocus = fitFocus;
        }
    }

    let priorFocusRect: DOMRect | undefined = undefined;

    beforeUpdate(() => {
        const focus = document.activeElement;
        if (focus && view && (view === focus || view.contains(focus)))
            priorFocusRect = focus.getBoundingClientRect();
    });

    afterUpdate(() => {
        // Did the body get focus after the update? Focus on the nearest view in output.
        if (
            document.activeElement === document.body &&
            priorFocusRect &&
            view
        ) {
            const focusable = getMeasuredFocusableOutput(
                DOMRectCenter(priorFocusRect)
            );
            // Pick the closest view to focus
            let output: HTMLElement | undefined = undefined;
            if (focusable.length > 0) {
                const candidate = focusable.sort(
                    (a, b) => a.distance - b.distance
                )[0].view;
                if (candidate instanceof HTMLElement) output = candidate;
            }
            if (output) output.focus();
            else view?.focus();
        }
    });

    function adjustFocus(dx: number, dy: number, dz: number) {
        setFocus(
            renderedFocus.x + dx,
            renderedFocus.y + dy,
            renderedFocus.z + dz
        );
    }

    function setFocus(x: number, y: number, z: number) {
        // Set the new adjusted focus (updating the rendered focus, and thus the animator focus)
        adjustedFocus = createPlace(evaluator, x, y, z, 0);
        // Stop fitting
        fit = false;
    }

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), 250);
    }

    function handleMouseDown(event: MouseEvent) {
        // Focus the view if not focused.
        view?.focus();

        // Start dragging to move the focus
        if (view) {
            const rect = view.getBoundingClientRect();

            focusDrag = {
                startFocus: renderedFocus,
                left: event.clientX - rect.left,
                top: event.clientY - rect.top,
            };
        }

        if (evaluator.isPlaying()) {
            evaluator
                .getNativeStreamsOfType(MouseButton)
                .forEach((stream) => stream.record(true));

            // Was the target clicked on output with a name? Add it to choice streams.
            if (event.target instanceof HTMLElement)
                recordSelection(event.target);
        }

        if (editable) {
            if (!selectPointerOutput(event)) ignore();
        }
    }

    function recordSelection(target: HTMLElement) {
        // Was the target clicked on output with a name? Add it to choice streams.
        const name = target.dataset.name;
        const selectable = target.dataset.selectable === 'true';
        const selection =
            selectable && name
                ? name
                : verse.selectable
                ? verse.getName()
                : undefined;
        if (selection)
            evaluator
                .getNativeStreamsOfType(Selection)
                .forEach((stream) => stream.record(selection));
    }

    function handleMouseUp() {
        // If dragging, stop
        if (focusDrag) {
            focusDrag = undefined;
        }

        if (evaluator.isPlaying())
            evaluator
                .getNativeStreamsOfType(MouseButton)
                .map((stream) => stream.record(false));
    }

    function handleMouseMove(event: MouseEvent) {
        // If dragging the focus, adjust it accordingly.
        if (event.buttons === 1 && focusDrag && view) {
            const rect = view.getBoundingClientRect();
            const deltaX = event.clientX - rect.left - focusDrag.left;
            const deltaY = event.clientY - rect.top - focusDrag.top;
            const scale = PX_PER_METER;
            const scaleDeltaX = deltaX / scale;
            const scaleDeltaY = deltaY / scale;

            if (event.shiftKey) {
                setFocus(
                    focusDrag.startFocus.x + scaleDeltaX,
                    focusDrag.startFocus.y - scaleDeltaY,
                    focusDrag.startFocus.z
                );
                event.stopPropagation();
            } else if (
                selectedOutput &&
                $selectedOutput &&
                $selectedOutput.length > 0 &&
                !$selectedOutput[0].is(
                    VerseType,
                    project.getNodeContext($selectedOutput[0])
                )
            ) {
                moveOutput(
                    $projects,
                    project,
                    $selectedOutput,
                    $preferredLanguages,
                    scaleDeltaX,
                    -scaleDeltaY,
                    false
                );
                event.stopPropagation();
            }
        }

        if (evaluator.isPlaying())
            evaluator
                .getNativeStreamsOfType(MousePosition)
                .map((stream) => stream.record(event.offsetX, event.offsetY));
        // Don't give feedback on this; it's not expected.
    }

    function handleWheel(event: WheelEvent) {
        adjustFocus(0, 0, event.deltaY / Math.pow(PX_PER_METER, 2));
        event.preventDefault();
    }

    function handleDoubleclick(event: MouseEvent) {
        if (selectedOutputPaths && selectedPhrase) {
            if (evaluator.isPlaying()) {
                evaluator.pause();
                selectPointerOutput(event);
            } else {
                setSelectedOutput(selectedOutputPaths, project, []);
                selectedPhrase.set(null);
                evaluator.play();
            }
        }
    }

    function handleKeyUp(event: KeyboardEvent) {
        // Never handle tab; that's for keyboard navigation.
        if (event.key === 'Tab') return;

        // If dragging the focus, stop
        if (focusDrag) focusDrag = undefined;

        if (evaluator.isPlaying()) {
            evaluator
                .getNativeStreamsOfType(Keyboard)
                .map((stream) => stream.record(event.key, false));
        }
    }

    function getFocusableOutput() {
        return view
            ? Array.from(view.querySelectorAll('.output[tabindex="0"'))
            : [];
    }

    function getMeasuredFocusableOutput(center: [number, number]) {
        return getFocusableOutput().map((focusable) => {
            const rect = focusable.getBoundingClientRect();
            const distance = DOMRectDistance(center, rect);
            return {
                view: focusable,
                rect,
                distance,
            };
        });
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Never handle tab; that's for focus navigation.
        if (event.key === 'Tab') return;

        // Adjust verse focus
        if (event.shiftKey) {
            const increment = 1;
            if (event.key === 'ArrowLeft') {
                return adjustFocus(-1 * increment, 0, 0);
            } else if (event.key === 'ArrowRight') {
                return adjustFocus(increment, 0, 0);
            } else if (event.key === 'ArrowUp') {
                return adjustFocus(0, 1 * increment, 0);
            } else if (event.key === 'ArrowDown') {
                return adjustFocus(0, -1 * increment, 0);
            } else if (event.key === '+') {
                return adjustFocus(0, 0, 1);
            } else if (event.key === '_') {
                return adjustFocus(0, 0, -1);
            }
        }

        // Adjust keyboard focus
        if (
            event.altKey &&
            event.key.startsWith('Arrow') &&
            view &&
            document.activeElement?.classList.contains('output')
        ) {
            // Which way are we moving?
            const direction = {
                ArrowRight: [1, 0],
                ArrowLeft: [-1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
            }[event.key];

            if (direction) {
                const focusRect =
                    document.activeElement.getBoundingClientRect();

                const focusCenter = DOMRectCenter(focusRect);

                const focusable = getMeasuredFocusableOutput(focusCenter)
                    // Exclude
                    .filter(
                        (focusable) =>
                            (focusable.view !== document.activeElement &&
                                direction[0] > 0 &&
                                focusRect.left < focusable.rect.left) ||
                            (direction[0] < 0 &&
                                focusRect.right > focusable.rect.right) ||
                            (direction[1] > 0 &&
                                focusRect.top < focusable.rect.top) ||
                            (direction[1] < 0 &&
                                focusRect.bottom > focusable.rect.bottom)
                    )
                    // Sort by distance to center
                    .sort((a, b) => a.distance - b.distance);

                const nearest = focusable[0];
                if (nearest && nearest.view instanceof HTMLElement) {
                    nearest.view.focus();
                    return;
                }
            }

            // Find the nearest focusable
        }

        // Record the key event on all keyboard streams if it wasn't handled above.
        if (evaluator.isPlaying()) {
            evaluator
                .getNativeStreamsOfType(Keyboard)
                .map((stream) => stream.record(event.key, true));

            // Was the target clicked on output with a name? Add it to choice streams.
            if (
                (event.key === 'Enter' || event.key === ' ') &&
                event.target instanceof HTMLElement
            )
                recordSelection(event.target);
        }
        // else ignore();

        if (editable) selectKeyboardOutput(event);
    }

    function getOutputNodeIDFromElement(
        element: Element | null
    ): number | undefined {
        if (!(element instanceof HTMLElement)) return;
        const nodeIDString = element.dataset.nodeId;
        if (nodeIDString === undefined) return;
        const nodeID = parseInt(nodeIDString);
        if (isNaN(nodeID)) return;
        return nodeID;
    }

    function getOutputNodeIDUnderMouse(event: MouseEvent): number | undefined {
        // Find the nearest .output element and get its node-id data attribute.
        const element = document.elementFromPoint(event.clientX, event.clientY);
        if (!(element instanceof HTMLElement)) return;
        return getOutputNodeIDFromElement(element.closest('.output'));
    }

    function getOutputNodeIDFromFocus(): number | undefined {
        const focus = document.activeElement;
        if (!(focus instanceof HTMLElement)) return undefined;
        return getOutputNodeIDFromElement(focus);
    }

    function getOutputNodeFromID(
        nodeID: number | undefined
    ): Evaluate | undefined {
        if (nodeID === undefined) return undefined;

        // Find the node with the corresponding id in the current project.
        const node = project.getNodeByID(nodeID);
        return node instanceof Evaluate ? node : undefined;
    }

    /**
     * Given a mouse event, finds the nearest output under the mouse and adds it to the project selection
     * if so.
     */
    function selectPointerOutput(event: MouseEvent): boolean {
        if (
            selectedOutputPaths === undefined ||
            $selectedOutput === undefined ||
            selectedPhrase === undefined
        )
            return false;
        // If we found the node in the project, add it to the selection.
        const evaluate = getOutputNodeFromID(getOutputNodeIDUnderMouse(event));
        if (evaluate) {
            // If the shift key is down
            let newSelection: Evaluate[];
            if (event.shiftKey) {
                const index = $selectedOutput.indexOf(evaluate);
                // If it's in the set, remove it.
                if (index >= 0) {
                    newSelection = [
                        ...$selectedOutput.slice(0, index),
                        ...$selectedOutput.slice(index + 1),
                    ];
                } else {
                    newSelection = [...$selectedOutput, evaluate];
                }
            }
            // Otherise, set the selection to the selection.
            else newSelection = [evaluate];

            // Update the selection
            setSelectedOutput(selectedOutputPaths, project, newSelection);
            // Erase the selected phrase.
            selectedPhrase.set(null);

            // Focus it too, for keyboard output.
            const outputView = view?.querySelector(
                `[data-node-id="${evaluate.id}"`
            );

            if (outputView instanceof HTMLElement) outputView.focus();
        }

        return true;
    }

    function selectKeyboardOutput(event: KeyboardEvent) {
        if (selectedOutputPaths === undefined || $selectedOutput === undefined)
            return;

        const evaluate = getOutputNodeFromID(getOutputNodeIDFromFocus());
        if (evaluate === undefined) return;

        // Add or remove the focused node from the selection.
        if (event.key === 'Enter' || event.key === ' ') {
            setSelectedOutput(
                selectedOutputPaths,
                project,
                $selectedOutput.includes(evaluate)
                    ? $selectedOutput.filter((o) => o !== evaluate)
                    : [evaluate]
            );
        }
        // Remove the node that created this phrase.
        else if (event.key === 'Backspace' && (event.metaKey || event.ctrlKey))
            $projects.reviseNodes(project, [[evaluate, undefined]]);

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
        class="output verse {interactive && !editing
            ? 'live'
            : 'inert'} {project.main.names.getNames()[0]}"
        class:ignored
        class:interactive
        class:selected={verse.value.creator instanceof Evaluate &&
            $selectedOutput &&
            $selectedOutput.includes(verse.value.creator)}
        class:editing={$evaluation?.playing === false}
        data-id={verse.getHTMLID()}
        data-node-id={verse.value.creator.id}
        data-selectable={verse.selectable}
        tabIndex={interactive ? 0 : null}
        style={toCSS({
            'font-family': `"${verse.font}", "${DefaultFont}"`,
            background: verse.background.toCSS(),
            color:
                (verse.rest instanceof Pose
                    ? verse.rest.color?.toCSS()
                    : undefined) ?? 'var(--wordplay-foreground)',
        })}
        on:mousedown={(event) => (interactive ? handleMouseDown(event) : null)}
        on:mouseup={interactive ? handleMouseUp : null}
        on:mousemove={interactive ? handleMouseMove : null}
        on:dblclick={interactive && !fullscreen ? handleDoubleclick : null}
        on:keydown={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        on:wheel={interactive ? handleWheel : null}
        bind:this={view}
    >
        <div
            class="viewport"
            class:changed
            style:transform={centerTransform(viewportWidth, viewportHeight)}
        >
            <!-- Render the verse -->
            <GroupView
                group={verse}
                place={center}
                focus={renderedFocus}
                root
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
                    {@const right = Math.max(
                        0,
                        contentBounds.right + GRID_PADDING
                    )}
                    {@const bottom = Math.min(
                        0,
                        Math.floor(contentBounds.bottom - GRID_PADDING)
                    )}
                    {@const top = Math.max(0, contentBounds.top + GRID_PADDING)}
                    <!-- Render a grid if this is the root and the grid is on. Apply the same transform that we do the the verse. -->
                    {#each range(left, right) as number}
                        <div
                            class="gridline vertical"
                            style:left="{number * PX_PER_METER}px"
                            style:top="{-top * PX_PER_METER}px"
                            style:height="{Math.abs(top - bottom) *
                                PX_PER_METER}px"
                        />
                    {/each}
                    {#each range(bottom, top) as number}
                        <div
                            class="gridline horizontal"
                            style:top="{-number * PX_PER_METER}px"
                            style:left="{left * PX_PER_METER}px"
                            style:width="{Math.abs(left - right) *
                                PX_PER_METER}px"
                        />
                    {/each}
                    <div
                        class="gridline horizontal axis"
                        style:top="0px"
                        style:left="{left * PX_PER_METER}px"
                        style:width="{Math.abs(left - right) * PX_PER_METER}px"
                    />
                    <div
                        class="gridline vertical axis"
                        style:left="0px"
                        style:top="{-top * PX_PER_METER}px"
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
            </GroupView>
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

    .verse[data-selectable='true'] {
        cursor: pointer;
    }

    .verse:focus:not(.verse.selected) {
        outline: none;
    }

    .verse.editing.interactive.selected {
        outline: var(--wordplay-focus-width) dotted var(--wordplay-highlight);
        outline-offset: calc(-3 * var(--wordplay-focus-width));
    }

    .viewport {
        width: 100%;
        height: 100%;
    }

    :global(.animated) .viewport {
        transition: transform ease-out;
        transition-duration: 200ms;
    }

    .viewport.changed {
        transition: none;
    }

    :global(.animated) .ignored {
        animation: shake 1;
        animation-duration: 100ms;
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
        border-color: var(--wordplay-disabled-color);
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
        border-color: currentColor;
    }
</style>
