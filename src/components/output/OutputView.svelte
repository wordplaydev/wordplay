<script lang="ts">
    import { toStage } from '../../output/Stage';
    import ExceptionValue from '@values/ExceptionValue';
    import type Value from '@values/Value';
    import type Project from '@models/Project';
    import ValueView from '../values/ValueView.svelte';
    import StageView from './StageView.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import {
        IdleKind,
        getAnnounce,
        getConceptIndex,
        getEvaluation,
        getKeyboardEditIdle,
        getSelectedOutput,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import type PaintingConfiguration from './PaintingConfiguration';
    import { animationFactor, DB, locales, Projects } from '../../db/Database';
    import type Color from '../../output/Color';
    import Key from '../../input/Key';
    import { PX_PER_METER, rootScale } from '../../output/outputToCSS';
    import { DOMRectCenter, DOMRectDistance } from './utilities';
    import Choice from '../../input/Choice';
    import Evaluate from '../../nodes/Evaluate';
    import Pointer from '../../input/Pointer';
    import Place, { createPlace } from '../../output/Place';
    import moveOutput, { addStageContent } from '../palette/editOutput';
    import { getOrCreatePlace } from '../../output/getOrCreatePlace';
    import Placement from '../../input/Placement';
    import { toExpression } from '../../parser/parseExpression';
    import Chat from '../../input/Chat';
    import { default as ButtonUI } from '../widgets/Button.svelte';
    import Button from '../../input/Button';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { untrack } from 'svelte';
    import Fonts from '@basis/Fonts';

    interface Props {
        project: Project;
        evaluator: Evaluator;
        value: Value | undefined;
        editable: boolean;
        fit?: boolean;
        grid?: boolean;
        painting?: boolean;
        paintingConfig?: PaintingConfiguration | undefined;
        mini?: boolean;
        background?: Color | string | null;
    }

    let {
        project,
        evaluator,
        value,
        editable,
        fit = $bindable(true),
        grid = $bindable(false),
        painting = $bindable(false),
        paintingConfig = undefined,
        mini = false,
        background = $bindable(null),
    }: Props = $props();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    const evaluation = getEvaluation();
    const keyboardEditIdle = getKeyboardEditIdle();
    const selection = getSelectedOutput();
    const announce = getAnnounce();

    let ignored = $state(false);
    let valueView = $state<HTMLElement | undefined>();

    /** The state of dragging the adjusted focus. A location or nothing. */
    let drag = $state<
        { startPlace: Place; left: number; top: number } | undefined
    >();

    /** A list of points gathered during a painting drag */
    let paintingPlaces = $state<{ x: number; y: number }[]>([]);
    let strokeNodeID = $state<number | undefined>();

    /* We get these functions from the stage view, if there is one. */
    let stage = $state<ReturnType<typeof StageView> | undefined>();

    // The place the output is focusing on. Bound to the stage's focus, unless set here.
    let renderedFocus = $state<Place>(createPlace(evaluator, 0, 0, -12));

    /** A map from key string IDs to whether they are up or down */
    const keysDown: Map<string, boolean> = new Map();

    /** Event cache for touch panning and zooming */
    let pointersByIndex = $state<PointerEvent[]>([]);
    let startDifference = $state<number | undefined>();
    let startGesturePlace = $state<Place | undefined>();

    let keyboardInputView = $state<HTMLInputElement | undefined>();
    let keyboardInputText = $state('');

    const interactive = $derived(!mini);
    const exception = $derived(
        value instanceof ExceptionValue ? value : undefined,
    );

    /** Every time the value changes, try to parse a Stage from it. */
    const stageValue = $derived(
        value === undefined ? undefined : toStage(evaluator, value),
    );

    /** Every time the stage value changes, load any new fonts we might need */
    $effect(() => {
        if (stageValue) {
            const faces = stageValue.gatherFaces(new Set());
            untrack(() => {
                faces.forEach((face) => {
                    // Make sure this font is loaded. This is a little late -- we could do some static analysis
                    // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
                    if (face) Fonts.loadFace(face);
                });
            });
        }
    });

    /** Keep track of whether the creator is typing, so we can blur output until the next change. */
    const typing = $derived(
        !mini &&
            $evaluation?.playing === true &&
            $keyboardEditIdle === IdleKind.Typing,
    );

    /** Keep the bindable background color up to date. */
    $effect(() => {
        background =
            value instanceof ExceptionValue
                ? 'var(--wordplay-error)'
                : (stageValue?.background ?? null);
    });

    /** Keep track of streams that listen for keyboard input */
    const keys = $derived(
        $evaluation?.evaluator.getBasisStreamsOfType(Key).length > 0,
    );
    const placements = $derived(
        $evaluation?.evaluator.getBasisStreamsOfType(Placement).length > 0,
    );
    const chats = $derived(
        $evaluation?.evaluator.getBasisStreamsOfType(Chat).length > 0,
    );

    // Announce changes in values.
    $effect(() => {
        if ($announce && value !== undefined) {
            untrack(() =>
                $announce(
                    'value',
                    $locales.getLanguages()[0],
                    exception
                        ? exception.getExplanation($locales).toText()
                        : value.getDescription($locales).toText(),
                ),
            );
        }
    });

    /** When creator's preferred animation factor changes, update evaluator */
    $effect(() => evaluator.updateTimeMultiplier($animationFactor));

    function handleKeyUp(event: KeyboardEvent) {
        keysDown.set(event.key, false);

        if (event.key === 'Tab') return;

        // Reset the value if there's not a chat.
        if (!chats && keyboardInputView) {
            keyboardInputView.value = '';
        }

        // Is the program evaluating?
        if (evaluator.isPlaying()) {
            // Record the key event on all keyboard streams if it wasn't handled above.
            evaluator
                .getBasisStreamsOfType(Key)
                .map((stream) => stream.react({ key: event.key, down: false }));
        }
        // else ignore();
    }

    function handleKeyDown(event: KeyboardEvent) {
        keysDown.set(event.key, true);

        const command = event.metaKey || event.ctrlKey;
        const shift = event.shiftKey;
        const select =
            (event.key === 'Enter' || event.key === ' ') && !command && !shift;

        // Never handle tab; that's for keyboard navigation.
        if (event.key === 'Tab') return;

        // Adjust verse focus
        if (shift && stage) {
            const increment = 1;
            if (event.key === 'ArrowLeft') {
                event.stopPropagation();
                return stage.adjustFocus(-1 * increment, 0, 0);
            } else if (event.key === 'ArrowRight') {
                event.stopPropagation();
                return stage.adjustFocus(increment, 0, 0);
            } else if (event.key === 'ArrowUp') {
                event.stopPropagation();
                return stage.adjustFocus(0, 1 * increment, 0);
            } else if (event.key === 'ArrowDown') {
                event.stopPropagation();
                return stage.adjustFocus(0, -1 * increment, 0);
            } else if (event.key === '+') {
                event.stopPropagation();
                return stage.adjustFocus(0, 0, 1);
            } else if (event.key === '_') {
                event.stopPropagation();
                return stage.adjustFocus(0, 0, -1);
            }
        }

        // Find the nearest focusable
        if (
            event.altKey &&
            event.key.startsWith('Arrow') &&
            valueView &&
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
                                focusRect.bottom > focusable.rect.bottom),
                    )
                    // Sort by distance to center
                    .sort((a, b) => a.distance - b.distance);

                const nearest = focusable[0];
                if (nearest && nearest.view instanceof HTMLElement) {
                    setKeyboardFocus(
                        nearest.view,
                        'Focusing nearest view in output.',
                    );
                    event.stopPropagation();
                    return;
                }
            }
        }

        if (
            !evaluator.isPlaying() &&
            editable &&
            selection?.selectedPaths !== undefined &&
            selection.selectedOutput !== undefined
        ) {
            const evaluate = getOutputNodeFromID(getOutputNodeIDFromFocus());
            if (evaluate !== undefined) {
                // Add or remove the focused node from the selection.
                if (select) {
                    selection.setSelectedOutput(
                        project,
                        selection.selectedOutput.includes(evaluate)
                            ? selection.selectedOutput.filter(
                                  (o) => o !== evaluate,
                              )
                            : [evaluate],
                    );
                    event.stopPropagation();
                    return;
                }
                // Remove the node that created this phrase.
                else if (editable && event.key === 'Backspace' && command) {
                    Projects.revise(project, [[evaluate, undefined]]);
                    event.stopPropagation();
                    return;
                }

                // // meta-a: select all phrases
                // if (editable && event.key === 'a' && (event.metaKey || event.ctrlKey))
                //     selectedOutput.set(
                //         Array.from(
                //             new Set(visible.map((phrase) => phrase.value.creator))
                //         )
                //     );
            }
        }

        if (evaluator.isPlaying()) {
            // Was the target clicked on output with a name? Add it to choice streams.
            if (select && event.target instanceof HTMLElement) {
                recordSelection(event);
                event.stopPropagation();
            }
        }

        // If dragging the focus, stop
        if (drag) drag = undefined;

        // Finally, if the event was ignored by all of the above, pass it to streams.
        if (evaluator.isPlaying()) {
            evaluator
                .getBasisStreamsOfType(Key)
                .map((stream) => stream.react({ key: event.key, down: true }));

            // Announce the key pressed
            if ($announce)
                $announce('keyinput', $locales.getLanguages()[0], event.key);

            // Map keys onto axes of change for any Placement streams.
            if (
                event.key.startsWith('Arrow') ||
                event.key === '-' ||
                event.key === '='
            ) {
                evaluator.getBasisStreamsOfType(Placement).map((stream) =>
                    stream.react({
                        x: keysDown.get('ArrowLeft')
                            ? -1
                            : keysDown.get('ArrowRight')
                              ? 1
                              : 0,
                        y: keysDown.get('ArrowUp')
                            ? 1
                            : keysDown.get('ArrowDown')
                              ? -1
                              : 0,
                        z: keysDown.get('-') ? 1 : keysDown.get('=') ? -1 : 0,
                    }),
                );
                event.stopPropagation();
            }
        }
    }

    function submitChat() {
        // Get the message
        const message = keyboardInputText;

        // Reset the message
        keyboardInputText = '';

        // Pass the message to the chats
        evaluator
            .getBasisStreamsOfType(Chat)
            .forEach((stream) => stream.react(message));
    }

    function handleWheel(event: WheelEvent) {
        if (stage) {
            stage.adjustFocus(0, 0, event.deltaY / PX_PER_METER);
            event.preventDefault();
        }
    }

    function handlePointerDown(event: PointerEvent) {
        // Add event to pointer event cache for
        pointersByIndex.push(event);

        // Focus the keyboard input if it exists.
        if (keyboardInputView) {
            setKeyboardFocus(
                keyboardInputView,
                'Focusing output text field on pointer down.',
            );
            event.stopPropagation();
            event.preventDefault();
        }

        // If the evaluator is playing, record button events.
        if (evaluator.isPlaying()) {
            evaluator
                .getBasisStreamsOfType(Button)
                .forEach((stream) => stream.react(true));

            // Was the target clicked on output with a name? Add it to choice streams.
            if (event.target instanceof HTMLElement) {
                const output = event.target.closest('.output');
                if (output instanceof HTMLElement) recordSelection(event);
            }
        }

        // If we're editable and not playing, select output.
        if (editable && !evaluator.isPlaying()) {
            if (painting) {
                if (selection?.selectedPaths)
                    selection.setSelectedOutput(project, []);
            } else if (!selectPointerOutput(event)) ignore();
        }

        // If there's a Placement, send it some navigation events based on position.
        const placements = evaluator.getBasisStreamsOfType(Placement);
        if (placements.length > 0 && valueView && stageValue) {
            for (const placement of placements) {
                // First, find the output on stage that this placement is placing,
                // so we can find the position of the pointer relative to the output.
                const output = stageValue.find(
                    (output) => output.place?.value === placement.latest(),
                );
                // Couldn't find the output? Move to the next one.
                if (output === undefined) continue;

                // Now find the view of the output.
                const outputView = document.querySelector(
                    `[data-id="${output.getHTMLID()}"]`,
                );
                // Couldn't find the view? Move on to the next one.
                if (outputView === null) continue;

                const outputRect = outputView.getBoundingClientRect();
                const outputX = outputRect.left + outputRect.width / 2;
                const outputY = outputRect.top + outputRect.height / 2;
                const relativePointerX = event.clientX - outputX;
                const relativePointerY = event.clientY - outputY;
                const atan2 =
                    (Math.atan2(relativePointerY, relativePointerX) * 180) /
                    Math.PI;
                const angle =
                    relativePointerY < 0 ? Math.abs(atan2) : 360 - atan2;

                const threshold = 20;
                // Divide the 360 degrees into 45 degree segments
                // Send the navigation directions to all all of the placements.
                placement.react({
                    x:
                        angle < 90 - threshold || angle > 270 + threshold
                            ? 1
                            : angle > 90 + threshold && angle < 270 - threshold
                              ? -1
                              : 0,
                    y:
                        angle > threshold && angle < 180 - threshold
                            ? 1
                            : angle > 180 + threshold && angle < 360 - threshold
                              ? -1
                              : 0,
                    z: 0,
                });
            }
        }

        // If there's a focus, start dragging.
        if (valueView && renderedFocus) {
            // Start dragging.
            const rect = valueView.getBoundingClientRect();
            const dx = event.clientX - rect.left;
            const dy = event.clientY - rect.top;
            const { x: mx, y: my } = pixelsToMeters(
                dx - rect.width / 2,
                -(dy - rect.height / 2),
                0,
                renderedFocus.z,
            );
            const focus = event.shiftKey;
            const place =
                // If painting, the start place is where the click was
                painting
                    ? new Place(
                          renderedFocus.value,
                          mx - renderedFocus.x,
                          my + renderedFocus.y,
                          0,
                      )
                    : // If moving focus, the start place is the rendered focus
                      focus
                      ? renderedFocus
                      : // If there's selected output, it's the first output selected, and it has a place
                        selection?.selectedOutput &&
                          selection.selectedOutput.length > 0
                        ? getOrCreatePlace(
                              project,
                              $locales,
                              selection.selectedOutput[0],
                              evaluator.project.getNodeContext(
                                  selection.selectedOutput[0],
                              ),
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
    function handlePointerMove(event: PointerEvent) {
        // TOUCH PANNING AND ZOOMING

        // Find the last event we had for this pointer.
        const index = pointersByIndex.findIndex(
            (ev) => ev.pointerId === event.pointerId,
        );
        // Replace it with this new event
        if (index >= 0) pointersByIndex[index] = event;

        // If there are two pointers down, check for a pinch
        if (pointersByIndex.length === 2) {
            // Find the difference on the x axis
            const currentPointerDifference = Math.abs(
                pointersByIndex[0].clientX - pointersByIndex[1].clientX,
            );
            // No differences yet? Initialize to the current difference, which
            // is the anchor difference. Also initialize to the current rendered focus.
            if (
                startDifference === undefined ||
                startGesturePlace === undefined
            ) {
                startDifference = currentPointerDifference;
                startGesturePlace = renderedFocus;
            } else {
                const delta = currentPointerDifference - startDifference;
                const scale = rootScale(0, startGesturePlace.z);
                const newZ = startGesturePlace.z + delta / PX_PER_METER / scale;
                const boundedNewZ =
                    newZ > -1 || newZ === Infinity
                        ? -1
                        : newZ < -40 || newZ === -Infinity
                          ? -40
                          : newZ;

                if (!isNaN(boundedNewZ) && stage)
                    stage.setFocus(
                        startGesturePlace.x,
                        startGesturePlace.y,
                        boundedNewZ,
                    );
            }
        }

        // MOUSE PANNING AND ZOOMING

        // Handle focus or output moves..
        if (event.buttons === 1 && drag && renderedFocus) {
            const valueRect = valueView?.getBoundingClientRect();
            if (valueRect !== undefined) {
                const mouseXDelta = event.clientX - valueRect.left - drag.left;
                const mouseYDelta = event.clientY - valueRect.top - drag.top;
                const { x: renderedDeltaX, y: renderedDeltaY } = pixelsToMeters(
                    mouseXDelta,
                    mouseYDelta,
                    drag.startPlace.z,
                    renderedFocus.z,
                );

                const newX = twoDigits(drag.startPlace.x + renderedDeltaX);
                const newY = twoDigits(drag.startPlace.y - renderedDeltaY);

                // If painting, gather points
                if (editable && painting && paintingConfig) {
                    // Is the new position a certain Euclidian distance from the most recent position? Add a point to the stroke.
                    const prior = paintingPlaces.at(-1);
                    if (
                        prior === undefined ||
                        Math.sqrt(
                            Math.pow(prior.x - newX, 2) +
                                Math.pow(prior.y - newY, 2),
                        ) > 0.5
                    ) {
                        // Add the point
                        paintingPlaces.push({ x: newX, y: newY });

                        const minX = twoDigits(
                            Math.min.apply(
                                null,
                                paintingPlaces.map((p) => p.x),
                            ),
                        );
                        const minY = twoDigits(
                            Math.min.apply(
                                null,
                                paintingPlaces.map((p) => p.y),
                            ),
                        );

                        // Create a stroke. represented as freeform group of phrases with explicit positions.
                        const group = toExpression(
                            `Group(Free() [${paintingPlaces
                                .map(
                                    (p) =>
                                        `Place(${twoDigits(
                                            p.x - minX,
                                        )}m ${twoDigits(p.y - minY)}m)`,
                                )
                                .join(
                                    ' ',
                                )}].translate(ƒ(place•Place) Phrase('a' place: place)) place: Place(${minX}m ${minY}m))`,
                        );

                        // Add the stroke to the project's verse
                        if (strokeNodeID === undefined) {
                            addStageContent(DB, project, group);
                        } else {
                            const node = project.getNodeByID(strokeNodeID);
                            if (node) Projects.revise(project, [[node, group]]);
                        }
                        strokeNodeID = group.id;
                    }
                }
                // If panning, move focus
                else {
                    if (event.shiftKey && stage) {
                        const scale = rootScale(0, renderedFocus.z);
                        // Scale down the mouse delta and offset by the drag starting point.
                        stage.setFocus(
                            renderedDeltaX / scale + drag.startPlace.x,
                            renderedDeltaY / scale + drag.startPlace.y,
                            drag.startPlace.z,
                        );
                        event.stopPropagation();
                    } else if (
                        selection?.selectedOutput &&
                        selection.selectedOutput.length > 0 &&
                        !selection.selectedOutput[0].is(
                            project.shares.output.Stage,
                            project.getNodeContext(selection.selectedOutput[0]),
                        )
                    ) {
                        moveOutput(
                            DB,
                            project,
                            selection.selectedOutput,
                            $locales,
                            newX,
                            newY,
                            false,
                        );
                        event.stopPropagation();
                    }
                }
            }
        }

        const pointerStreams = evaluator.getBasisStreamsOfType(Pointer);
        if (valueView && evaluator.isPlaying() && pointerStreams.length > 0) {
            const valueRect = valueView.getBoundingClientRect();
            if (valueRect !== undefined) {
                // First, get the position of the pointer relative to the tile bounds.
                const tileX =
                    event.clientX - valueRect.left - valueRect.width / 2;
                const tileY = -(
                    event.clientY -
                    valueRect.top -
                    valueRect.height / 2
                );

                // Now translate the position into stage coordinates.
                const position = pixelsToMeters(
                    tileX,
                    tileY,
                    0,
                    renderedFocus?.z ?? 0,
                );

                // Now translate the position relative to the stage focus.
                position.x -= renderedFocus?.x ?? 0;
                position.y -= renderedFocus?.y ?? 0;

                pointerStreams.forEach((stream) => stream.react(position));
            }
        }
    }

    function handlePointerUp(event: PointerEvent) {
        // Remove this event from the event cache.
        const index = pointersByIndex.findIndex(
            (ev) => ev.pointerId === event.pointerId,
        );
        if (index >= 0) pointersByIndex.splice(index, 1);
        // Rset the distance once the number of pointers is less than 2.
        if (pointersByIndex.length < 2) {
            cancelGesture();
        }

        drag = undefined;
        paintingPlaces = [];
        strokeNodeID = undefined;

        if (evaluator.isPlaying())
            evaluator
                .getBasisStreamsOfType(Button)
                .map((stream) => stream.react(false));
    }

    function cancelGesture() {
        startDifference = undefined;
        startGesturePlace = undefined;
        pointersByIndex = [];
    }

    function handlePointerLeave() {
        cancelGesture();
    }

    /**
     * Given a mouse event, finds the nearest output under the mouse and adds it to the project selection
     * if so.
     */
    function selectPointerOutput(event: PointerEvent | MouseEvent): boolean {
        if (
            selection === undefined ||
            selection.selectedPaths === undefined ||
            selection.selectedOutput === undefined ||
            selection.selectedPhrase === undefined
        )
            return false;
        // If we found the node in the project, add it to the selection.
        const evaluate = getOutputNodeFromID(getOutputNodeIDUnderMouse(event));
        if (evaluate) {
            // If the shift key is down
            let newSelection: Evaluate[];
            if (event.shiftKey) {
                const index = selection.selectedOutput.indexOf(evaluate);
                // If it's in the set, remove it.
                if (index >= 0) {
                    newSelection = [
                        ...selection.selectedOutput.slice(0, index),
                        ...selection.selectedOutput.slice(index + 1),
                    ];
                } else {
                    newSelection = [...selection.selectedOutput, evaluate];
                }
            }
            // Otherise, set the selection to the selection.
            else newSelection = [evaluate];

            // Update the selection
            selection.setSelectedOutput(project, newSelection);
            // Erase the selected phrase.
            selection.setSelectedPhrase(null);

            // Focus it too, for keyboard output.
            const outputView = valueView?.querySelector(
                `[data-node-id="${evaluate.id}"`,
            );

            if (outputView instanceof HTMLElement)
                setKeyboardFocus(
                    outputView,
                    'Focusing output on output selection',
                );
        }

        return true;
    }

    function pixelsToMeters(mx: number, my: number, z: number, focusZ: number) {
        const scale = rootScale(z, focusZ);
        return { x: mx / PX_PER_METER / scale, y: my / PX_PER_METER / scale };
    }

    function twoDigits(num: number): number {
        return Math.round(100 * num) / 100;
    }

    function getOutputNodeIDUnderMouse(
        event: PointerEvent | MouseEvent,
    ): number | undefined {
        // Find the nearest .output element and get its node-id data attribute.
        const element = document.elementFromPoint(event.clientX, event.clientY);
        if (!(element instanceof HTMLElement)) return;
        return getOutputNodeIDFromElement(element.closest('.output'));
    }
    function recordSelection(event: Event) {
        if (stageValue === undefined) return;

        const target = event?.target as HTMLElement;
        // Was the target clicked on output with a name? Add it to choice streams.
        const name = target.dataset.name;
        const selectable = target.dataset.selectable === 'true';
        const selection =
            selectable && name
                ? name
                : stageValue.selectable
                  ? stageValue.getName()
                  : undefined;
        if (selection) {
            evaluator
                .getBasisStreamsOfType(Choice)
                .forEach((stream) => stream.react(selection));
            event.stopPropagation();
        }
    }

    function getFocusableOutput() {
        return valueView
            ? Array.from(valueView.querySelectorAll('.output[tabindex="0"'))
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

    function getOutputNodeIDFromFocus(): number | undefined {
        const focus = document.activeElement;
        if (!(focus instanceof HTMLElement)) return undefined;
        return getOutputNodeIDFromElement(focus);
    }

    function getOutputNodeIDFromElement(
        element: Element | null,
    ): number | undefined {
        if (!(element instanceof HTMLElement)) return;
        const nodeIDString = element.dataset.nodeId;
        if (nodeIDString === undefined) return;
        const nodeID = parseInt(nodeIDString);
        if (isNaN(nodeID)) return;
        return nodeID;
    }

    function getOutputNodeFromID(
        nodeID: number | undefined,
    ): Evaluate | undefined {
        if (nodeID === undefined) return undefined;

        // Find the node with the corresponding id in the current project.
        const node = project.getNodeByID(nodeID);
        return node instanceof Evaluate ? node : undefined;
    }

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), $animationFactor * 100);
    }

    let priorFocusRect: DOMRect | undefined = undefined;

    // Keep track of the focus rect on the currently focused element so we
    // can track the nearest focused element after an update.
    $effect.pre(() => {
        const focus = document.activeElement;
        if (
            focus &&
            valueView &&
            (valueView === focus || valueView.contains(focus))
        )
            priorFocusRect = focus.getBoundingClientRect();
    });

    // After any update, set focus on the output nearest to the prior focus rect.
    $effect(() => {
        // Did the body get focus after the update? Focus on the nearest view in output.
        if (
            interactive &&
            document.activeElement === document.body &&
            priorFocusRect &&
            valueView
        ) {
            const focusable = getMeasuredFocusableOutput(
                DOMRectCenter(priorFocusRect),
            );
            // Pick the closest view to focus
            let output: HTMLElement | undefined = undefined;
            if (focusable.length > 0) {
                const candidate = focusable.sort(
                    (a, b) => a.distance - b.distance,
                )[0].view;
                if (candidate instanceof HTMLElement) output = candidate;
            }
            if (output)
                setKeyboardFocus(
                    output,
                    'Output lost focus, focusing on the closest focusbale output on stage',
                );
            else if (valueView)
                setKeyboardFocus(
                    valueView,
                    'Output lost focus, focusing on value output',
                );
        }
    });
</script>

<section
    class="output"
    data-testid="output"
    data-uiid="stage"
    aria-label={$locales.get((l) => l.ui.output.label)}
    class:mini
    class:editing={$evaluation?.playing === false && !painting}
    class:selected={stageValue &&
        stageValue.explicit &&
        stageValue.value.creator instanceof Evaluate &&
        selection?.selectedOutput &&
        selection.selectedOutput.includes(stageValue.value.creator)}
>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="value"
        class:ignored
        class:typing
        bind:this={valueView}
        onkeydown={interactive ? handleKeyDown : null}
        onkeyup={interactive ? handleKeyUp : null}
        onwheel={interactive ? handleWheel : null}
        onpointerdown={(event) => {
            event.stopPropagation();
            if (interactive) handlePointerDown(event);
        }}
        onpointerup={interactive ? handlePointerUp : null}
        onpointermove={interactive ? handlePointerMove : null}
        onpointerleave={interactive ? handlePointerLeave : null}
    >
        <!-- If there's an exception, show that. -->
        {#if exception !== undefined}
            <div class="message exception" class:mini data-uiid="exception"
                >{#if mini}!{:else}<Speech
                        glyph={index?.getNodeConcept(exception.creator) ??
                            exception.creator.getGlyphs($locales)}
                        invert
                    >
                        {#snippet content()}
                            <MarkupHTMLView
                                markup={exception.getExplanation($locales)}
                            />
                        {/snippet}</Speech
                    >
                {/if}
            </div>
            <!-- If there's no verse -->
        {:else if value === undefined}
            <div class="message evaluating" class:mini>◆</div>
            <!-- If there's a value, but it's not a stage, show that -->
        {:else if stageValue === undefined}
            <div class="message" class:mini>
                {#if mini}
                    <ValueView {value} interactive={false} />
                {:else}
                    {@const description = value
                        .getDescription($locales)
                        .toText()}
                    <h2>{description}</h2>
                    <ValueView {value} inline={false} />
                {/if}
            </div>
            <!-- Otherwise, show the Stage -->
        {:else}
            <StageView
                {project}
                {evaluator}
                stage={stageValue}
                background={mini}
                bind:fit
                bind:grid
                bind:painting
                bind:this={stage}
                bind:renderedFocus
                interactive={!mini}
                {editable}
            />
        {/if}
        <!-- These streams need keyboard input, so we make a text input field. If there's a chat stream, we make it visible. -->
        {#if keys || placements || chats}
            <div class="keyboard" class:visible={chats}>
                <input
                    type="text"
                    class="keyboard-input"
                    placeholder={chats
                        ? $locales.get((l) => l.ui.output.field.key.placeholder)
                        : null}
                    data-defaultfocus
                    aria-autocomplete="none"
                    aria-label={$locales.get(
                        (l) => l.ui.output.field.key.description,
                    )}
                    autocomplete={chats ? 'on' : 'off'}
                    autocorrect={chats ? 'on' : 'off'}
                    onkeydown={(event) =>
                        chats &&
                        event.key === 'Enter' &&
                        event.target &&
                        'value' in event.target
                            ? submitChat()
                            : null}
                    bind:value={keyboardInputText}
                    bind:this={keyboardInputView}
                />
                {#if chats}
                    <ButtonUI
                        background={background !== null}
                        tip={$locales.get((l) => l.ui.output.button.submit)}
                        action={submitChat}>↑</ButtonUI
                    >
                {/if}
            </div>
        {/if}
    </div>
</section>

<style>
    .output {
        transform-origin: top right;

        display: flex;
        flex-direction: column;
        justify-items: stretch;
        align-items: stretch;
        position: relative;
        height: 100%;

        flex-grow: 1;
    }

    .output.editing.selected {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-highlight-color);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .value {
        transform-origin: top right;

        flex-grow: 1;

        display: flex;
        flex-direction: column;
        justify-content: stretch;
        align-items: stretch;
        position: relative;

        overflow: hidden;
        transition:
            ease-in-out background-color,
            filter,
            ease-in,
            height ease-in;
        transition-duration: calc(var(--animation-factor) * 500ms);

        /** Query the container size */
        container-type: inline-size;
    }

    .value.typing {
        filter: blur(1em);
    }

    .mini {
        position: static;
        box-shadow: none;
        background-color: var(--wordplay-background);
        pointer-events: none;
        touch-action: none;
    }

    .message {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        padding: var(--wordplay-spacing);
        transform-origin: center;
        align-items: center;
        margin: auto;
        overflow: auto;
        padding-block-start: 2em;
    }

    .message.mini {
        margin: 0;
        padding: 0;
        font-size: inherit;
        overflow: hidden;
        flex-direction: row;
        justify-content: center;
    }

    @keyframes jiggle {
        0% {
            transform: rotate(-1deg) translate(0, 0);
        }
        25% {
            transform: rotate(2deg) translate(0, -1px);
        }
        50% {
            transform: rotate(-3deg) translate(0, 2px);
        }
        75% {
            transform: rotate(-1deg) translate(0, -1px);
        }
        100% {
            transform: rotate(2deg) translate(0, 1px);
        }
    }

    .exception {
        color: var(--wordplay-background);
        background-color: var(--wordplay-error);
    }

    .exception :global(.value) {
        color: var(--wordplay-evaluation-color);
    }

    .keyboard {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        outline: none;
        opacity: 0;
        display: flex;
        flex-direction: row;
        gap: 0;
    }

    .keyboard-input {
        pointer-events: none;
        touch-action: none;
        border: none;
        flex-grow: 1;
        font-size: var(--wordplay-font-size);
        padding: var(--wordplay-spacing);
    }

    .keyboard.visible {
        opacity: 1;
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
    }

    .keyboard-input:focus {
        outline: none;
    }

    .ignored {
        animation: shake 1;
        animation-duration: calc(var(--animation-factor) * 100ms);
    }

    h2 {
        margin-top: 1em;
    }
</style>
