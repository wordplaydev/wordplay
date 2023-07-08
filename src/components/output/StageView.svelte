<svelte:options immutable={true} />

<script lang="ts">
    import { afterUpdate, beforeUpdate, onDestroy, onMount } from 'svelte';
    import type Project from '@models/Project';
    import type Stage from '@output/Stage';
    import { loadedFonts } from '@native/Fonts';
    import { PX_PER_METER, rootScale, toCSS } from '@output/outputToCSS';
    import Place from '@output/Place';
    import Evaluate from '@nodes/Evaluate';
    import { DefaultFont, DefaultSize, StageType } from '@output/Stage';
    import Key from '@input/Key';
    import Pointer from '@input/Pointer';
    import Button from '@input/Button';
    import { createPlace } from '@output/Place';
    import Scene, { type OutputInfoSet } from '@output/Scene';
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
    import moveOutput, { addStageContent } from '../palette/editOutput';
    import {
        getAnimatingNodes,
        getEvaluation,
        getSelectedOutput,
        getSelectedOutputPaths,
        getSelectedPhrase,
        setSelectedOutput,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import Choice from '../../input/Choice';
    import { DOMRectCenter, DOMRectDistance } from './utilities';
    import type TypeOutput from '../../output/TypeOutput';
    import Sequence from '../../output/Sequence';
    import Reference from '../../nodes/Reference';
    import { getPlace } from '../../output/getPlace';
    import type PaintingConfiguration from './PaintingConfiguration';
    import { toExpression } from '../../parser/Parser';
    import { creator } from '../../db/Creator';

    export let project: Project;
    export let evaluator: Evaluator;
    export let verse: Stage;
    export let fullscreen: boolean;
    export let interactive: boolean;
    export let editable: boolean;
    export let fit: boolean;
    export let grid: boolean;
    export let painting: boolean;
    export let paintingConfig: PaintingConfiguration | undefined = undefined;

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

    /** The list of entered phrases */
    let entered: Map<string, TypeOutput> = new Map();
    let present: Map<string, TypeOutput> = new Map();
    let previouslyPresent: Map<string, TypeOutput> | undefined = undefined;

    /** A list of points gathered during a painting drag */
    let paintingPlaces: { x: number; y: number }[] = [];
    let strokeNodeID: number | undefined;

    /** A description of phrases that have entered the scene */
    $: enteredDescription =
        entered.size > 0
            ? Array.from(entered.values())
                  .filter(
                      (output): output is Phrase => output instanceof Phrase
                  )
                  .map((output) =>
                      output.getDescription($creator.getLanguages())
                  )
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
                        ?.getDescription($creator.getLanguages())
                        .toString();
                    const currentText = output
                        .getDescription($creator.getLanguages())
                        .toString();
                    if (
                        previousText !== currentText &&
                        typeof currentText === 'string'
                    ) {
                        const sequence =
                            output.rest instanceof Sequence
                                ? output.rest
                                : undefined;
                        const sequenceDescription = sequence
                            ? sequence.value.creator instanceof Evaluate &&
                              sequence.value.creator.inputs[0] instanceof
                                  Evaluate &&
                              sequence.value.creator.inputs[0].func instanceof
                                  Reference
                                ? sequence.value.creator.inputs[0].func.getName()
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

    /** The state of dragging the adjusted focus. A location or nothing. */
    let drag: { startPlace: Place; left: number; top: number } | undefined =
        undefined;

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
            verse,
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
        $creator.getLanguages(),
        $loadedFonts,
        $creator.getAnimationFactor()
    );
    $: contentBounds = verse.getLayout(context);

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
        adjustedFocus = createPlace(evaluator, x, y, z);
        // Stop fitting
        fit = false;
    }

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), 250);
    }

    function handlePointerDown(event: PointerEvent) {
        // Focus the view if not focused.
        view?.focus();

        if (evaluator.isPlaying()) {
            evaluator
                .getNativeStreamsOfType(Button)
                .forEach((stream) => stream.record(true));

            // Was the target clicked on output with a name? Add it to choice streams.
            if (event.target instanceof HTMLElement) {
                const output = event.target.closest('.output');
                if (output instanceof HTMLElement) recordSelection(output);
            }
        }

        if (editable && view) {
            if (painting) {
                if (selectedOutputPaths)
                    setSelectedOutput(selectedOutputPaths, project, []);
            } else if (!selectPointerOutput(event)) ignore();

            // Start dragging.
            const rect = view.getBoundingClientRect();
            const dx = event.clientX - rect.left;
            const dy = event.clientY - rect.top;
            const { x: mx, y: my } = mouseToMeters(
                dx - rect.width / 2,
                -(dy - rect.height / 2),
                0,
                renderedFocus.z
            );
            const focus = event.shiftKey;
            const place =
                // If painting, the start place is where the click was
                painting
                    ? new Place(
                          renderedFocus.value,
                          mx - renderedFocus.x,
                          my + renderedFocus.y,
                          0
                      )
                    : // If moving focus, the start place is the rendered focus
                    focus
                    ? renderedFocus
                    : // If there's selected output, it's the first output selected
                    $selectedOutput && $selectedOutput.length > 0
                    ? getPlace(
                          $selectedOutput[0],
                          evaluator.project.getNodeContext($selectedOutput[0])
                      )
                    : // Otherwise, there's no place the click started.
                      undefined;

            if (place) {
                fit = false;
                drag = {
                    startPlace: place,
                    left: dx,
                    top: dy,
                };
                // Reset the painting places
                paintingPlaces = [];
                strokeNodeID = undefined;
            }
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
                .getNativeStreamsOfType(Choice)
                .forEach((stream) => stream.record(selection));
    }

    function handleMouseUp() {
        drag = undefined;
        paintingPlaces = [];
        strokeNodeID = undefined;

        if (evaluator.isPlaying())
            evaluator
                .getNativeStreamsOfType(Button)
                .map((stream) => stream.record(false));
    }

    function mouseToMeters(mx: number, my: number, z: number, focusZ: number) {
        const scale = rootScale(z, focusZ);
        return { x: mx / PX_PER_METER / scale, y: my / PX_PER_METER / scale };
    }

    function twoDigits(num: number): number {
        return Math.round(100 * num) / 100;
    }

    function handlePointerMove(event: PointerEvent) {
        // Handle focus or output moves..
        if (event.buttons === 1 && drag && view) {
            const rect = view.getBoundingClientRect();
            const { x: renderedDeltaX, y: renderedDeltaY } = mouseToMeters(
                event.clientX - rect.left - drag.left,
                event.clientY - rect.top - drag.top,
                drag.startPlace.z,
                renderedFocus.z
            );

            const newX = twoDigits(drag.startPlace.x + renderedDeltaX);
            const newY = twoDigits(drag.startPlace.y - renderedDeltaY);

            // If painting, gather points
            if (painting && paintingConfig) {
                // Is the new position a certain Euclidian distance from the most recent position? Add a point to the stroke.
                const prior = paintingPlaces.at(-1);
                if (
                    prior === undefined ||
                    Math.sqrt(
                        Math.pow(prior.x - newX, 2) +
                            Math.pow(prior.y - newY, 2)
                    ) > 0.5
                ) {
                    // Add the point
                    paintingPlaces.push({ x: newX, y: newY });

                    const minX = twoDigits(
                        Math.min.apply(
                            null,
                            paintingPlaces.map((p) => p.x)
                        )
                    );
                    const minY = twoDigits(
                        Math.min.apply(
                            null,
                            paintingPlaces.map((p) => p.y)
                        )
                    );

                    // Create a stroke. represented as freeform group of phrases with explicit positions.
                    const group = toExpression(
                        `Group(Free() [${paintingPlaces
                            .map(
                                (p) =>
                                    `Place(${twoDigits(
                                        p.x - minX
                                    )}m ${twoDigits(p.y - minY)}m)`
                            )
                            .join(
                                ' '
                            )}].translate(ƒ(place•Place) Phrase('a' place: place)) place: Place(${minX}m ${minY}m))`
                    );

                    // Add the stroke to the project's verse
                    if (strokeNodeID === undefined) {
                        addStageContent($creator, project, group);
                    } else {
                        const node = project.getNodeByID(strokeNodeID);
                        if (node)
                            $creator.reviseProjectNodes(project, [
                                [node, group],
                            ]);
                    }
                    strokeNodeID = group.id;
                }
            } else {
                if (event.shiftKey) {
                    setFocus(newX, newY, drag.startPlace.z);
                    event.stopPropagation();
                } else if (
                    selectedOutput &&
                    $selectedOutput &&
                    $selectedOutput.length > 0 &&
                    !$selectedOutput[0].is(
                        StageType,
                        project.getNodeContext($selectedOutput[0])
                    )
                ) {
                    moveOutput(
                        $creator,
                        project,
                        $selectedOutput,
                        $creator.getLanguages(),
                        newX,
                        newY,
                        false
                    );
                    event.stopPropagation();
                }
            }
        }

        if (evaluator.isPlaying())
            evaluator
                .getNativeStreamsOfType(Pointer)
                .map((stream) => stream.record(event.offsetX, event.offsetY));
        // Don't give feedback on this; it's not expected.
    }

    function handleWheel(event: WheelEvent) {
        adjustFocus(0, 0, event.deltaY / Math.pow(PX_PER_METER, 2));
        event.preventDefault();
    }

    function handleDoubleclick(event: MouseEvent) {
        if (selectedOutputPaths && selectedPhrase && !fullscreen) {
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
        if (drag) drag = undefined;

        if (evaluator.isPlaying()) {
            evaluator
                .getNativeStreamsOfType(Key)
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
                event.stopPropagation();
                return adjustFocus(-1 * increment, 0, 0);
            } else if (event.key === 'ArrowRight') {
                event.stopPropagation();
                return adjustFocus(increment, 0, 0);
            } else if (event.key === 'ArrowUp') {
                event.stopPropagation();
                return adjustFocus(0, 1 * increment, 0);
            } else if (event.key === 'ArrowDown') {
                event.stopPropagation();
                return adjustFocus(0, -1 * increment, 0);
            } else if (event.key === '+') {
                event.stopPropagation();
                return adjustFocus(0, 0, 1);
            } else if (event.key === '_') {
                event.stopPropagation();
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
                .getNativeStreamsOfType(Key)
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

    function getOutputNodeIDUnderMouse(
        event: PointerEvent | MouseEvent
    ): number | undefined {
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
    function selectPointerOutput(event: PointerEvent | MouseEvent): boolean {
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
            $creator.reviseProjectNodes(project, [[evaluate, undefined]]);

        // // meta-a: select all phrases
        // if (editable && event.key === 'a' && (event.metaKey || event.ctrlKey))
        //     selectedOutput.set(
        //         Array.from(
        //             new Set(visible.map((phrase) => phrase.value.creator))
        //         )
        //     );
    }

    const halfGridlineThickness = 0.1;
</script>

{#if mounted}
    <div
        class="interactor"
        role="presentation"
        on:pointerdown|stopPropagation={(event) =>
            interactive ? handlePointerDown(event) : null}
        on:pointerup={interactive ? handleMouseUp : null}
        on:pointermove={interactive ? handlePointerMove : null}
        on:dblclick={interactive && !fullscreen ? handleDoubleclick : null}
        on:keydown={interactive ? handleKeyDown : null}
        on:keyup={interactive ? handleKeyUp : null}
        on:wheel={interactive ? handleWheel : null}
        tabIndex={interactive ? 0 : null}
    >
        <section
            class="output verse {interactive && !editing
                ? 'live'
                : 'inert'} {project.main.names.getNames()[0]}"
            class:ignored
            class:interactive
            class:changed
            class:selected={verse.value.creator instanceof Evaluate &&
                $selectedOutput &&
                $selectedOutput.includes(verse.value.creator)}
            class:editing={$evaluation?.playing === false && !painting}
            data-id={verse.getHTMLID()}
            data-node-id={verse.value.creator.id}
            data-selectable={verse.selectable}
            data-defaultfocus
            style={toCSS({
                'font-family': `"${verse.font}", ${DefaultFont}`,
                background: verse.background.toCSS(),
                color:
                    (verse.rest instanceof Pose
                        ? verse.rest.color?.toCSS()
                        : undefined) ?? 'var(--wordplay-foreground)',
            })}
            bind:this={view}
        >
            <!-- Render the verse -->
            <GroupView
                group={verse}
                place={center}
                focus={renderedFocus}
                viewport={{ width: viewportWidth, height: viewportHeight }}
                clip={verse.frame}
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
                            style:left="{number * PX_PER_METER -
                                halfGridlineThickness}px"
                            style:top="{-top * PX_PER_METER -
                                halfGridlineThickness}px"
                            style:height="{Math.abs(top - bottom) *
                                PX_PER_METER}px"
                        />
                    {/each}
                    {#each range(bottom, top) as number}
                        <div
                            class="gridline horizontal"
                            style:top="{-number * PX_PER_METER -
                                halfGridlineThickness}px"
                            style:left="{left * PX_PER_METER -
                                halfGridlineThickness}px"
                            style:width="{Math.abs(left - right) *
                                PX_PER_METER}px"
                        />
                    {/each}
                    <div
                        class="gridline horizontal axis"
                        style:top="0px"
                        style:left="{left * PX_PER_METER -
                            halfGridlineThickness}px"
                        style:width="{Math.abs(left - right) * PX_PER_METER}px"
                    />
                    <div
                        class="gridline vertical axis"
                        style:left="0px"
                        style:top="{-top * PX_PER_METER -
                            halfGridlineThickness}px"
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
                                >{$creator.getLocale().term.entered}
                                {enteredDescription}</p
                            >
                        {/if}
                        {#if changedDescription.length > 0}
                            <p
                                >{$creator.getLocale().term.changed}
                                {changedDescription}</p
                            >
                        {/if}
                    </div>
                {/if}
            </GroupView>
        </section>
    </div>
{/if}

<style>
    .interactor {
        width: 100%;
        height: 100%;
    }

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

    .verse {
        transition: transform ease-out;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .verse.changed {
        transition: none;
    }

    .ignored {
        animation: shake 1;
        animation-duration: calc(var(--animation-factor) * 100ms);
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
        border: none;
        background: var(--wordplay-disabled-color);
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
        background: currentColor;
    }

    .output-changes {
        font-size: 0;
    }
</style>
