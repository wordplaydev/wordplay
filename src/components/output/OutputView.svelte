<script lang="ts">
    import getConceptName from '@locale/getConceptName';
    import Fonts from '@basis/Fonts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Project from '@db/projects/Project';
    import concretize from '@locale/concretize';
    import type Evaluator from '@runtime/Evaluator';
    import { withMonoEmoji } from '@unicode/emoji';
    import ExceptionValue from '@values/ExceptionValue';
    import type Value from '@values/Value';
    import { onDestroy, untrack } from 'svelte';
    import {
        animationFactor,
        DB,
        locales,
        Projects,
        voice,
    } from '@db/Database';
    import Button from '@input/Button';
    import Chat from '@input/Chat';
    import Choice from '@input/Choice';
    import { handLandmarkerStatus } from '@input/HandLandmarkerLoader.svelte';
    import Key from '@input/Key';
    import Placement from '@input/Placement';
    import Pointer from '@input/Pointer';
    import Evaluate from '@nodes/Evaluate';
    import {
        rotatedOutput,
        resizedOutput,
        resizeIsIncremental,
    } from '@components/output/editHandles';
    import PermissionException from '@values/PermissionException';
    import PermissionSplash from '@components/output/PermissionSplash.svelte';
    import {
        consent,
        grantConsent,
        type PermissionName,
    } from '@input/permissions';
    import type Color from '@output/Color';
    import { toColor } from '@output/Color';
    import { describeColorLocalized } from '@output/BasicColors';
    import { toOutput } from '@output/toOutput';
    import { NameGenerator } from '@output/Stage';
    import TextValue from '@values/TextValue';
    import { getOrCreatePlace } from '@output/getOrCreatePlace';
    import { PX_PER_METER, rootScale } from '@output/outputToCSS';
    import Place, { createPlace } from '@output/Place';
    import { toStage } from '@output/Stage';
    import { toExpression } from '@parser/parseExpression';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import moveOutput, {
        addStageContent,
    } from '@components/palette/editOutput';
    import {
        getAnnouncer,
        getConceptIndex,
        getEvaluation,
        getKeyboardEditIdle,
        getRevealPalette,
        getSelectedOutput,
        IdleKind,
    } from '@components/project/Contexts';
    import ValueView from '@components/values/ValueView.svelte';
    import { default as ButtonUI } from '@components/widgets/Button.svelte';
    import type PaintingConfiguration from '@components/output/PaintingConfiguration';
    import StageView from '@components/output/StageView.svelte';
    import {
        DOMRectCenter,
        DOMRectDistance,
    } from '@components/output/utilities';

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
        /** Whether to process mouse wheel events without the shift key. Useful to disable for examples embedded in scrollable pages. */
        wheel?: boolean;
        /** Reflects whether the current stage value has an explicit place set. */
        hasStagePlace?: boolean;
        /** Reflects whether the audience has overridden the stage's computed focus via zoom/pan controls. */
        focusOverridden?: boolean;
        /** Whether to blur the output while the user is typing in the project's editor. True for the main stage; false for embedded examples that are unaffected by the user's typing. */
        blurOnTyping?: boolean;
        /** Called when the viewer clicks Retry after a PermissionException. The host should restart the evaluator so failed streams can re-attempt getUserMedia. */
        onretry?: () => void;
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
        wheel = true,
        hasStagePlace = $bindable(false),
        focusOverridden = $bindable(false),
        blurOnTyping = true,
        onretry = undefined,
    }: Props = $props();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    const evaluation = getEvaluation();
    const keyboardEditIdle = getKeyboardEditIdle();
    const selection = getSelectedOutput();
    const announce = getAnnouncer();
    const revealPalette = getRevealPalette();

    let ignored = $state(false);
    let valueView = $state<HTMLElement | undefined>();

    // The continuous rotate/size handle drag is owned HERE, on the stable stage view — not in the
    // per-output handle component, which re-mounts on every Projects.revise() (GroupView keys by
    // creator id) and would gap its listeners mid-drag. Gated on the steady `dragging` flag so it
    // attaches once per gesture; on each move it re-resolves the dragged output from the live
    // selection (robust to re-mount) and pivots on the center captured at gesture start.
    $effect(() => {
        if (!selection?.dragging) return;

        // Coalesce pointermove to at most one revise per animation frame, always applying the LATEST
        // pointer position. A handle drag's revise drives the whole edit pipeline (evaluator + Editor
        // + Palette), so processing every raw pointermove (often faster than the frame rate) backs up
        // the main thread. rAF keeps the stage frame-synced (unlike a debounce timer, which would lag
        // the pointer). Modeled on Evaluator.later()'s rAF use.
        let pendingMove: PointerEvent | undefined;
        let frame: number | undefined;

        function schedule(event: PointerEvent) {
            pendingMove = event;
            if (frame !== undefined) return;
            frame = requestAnimationFrame(() => {
                frame = undefined;
                const event = pendingMove;
                pendingMove = undefined;
                if (event) applyMove(event);
            });
        }

        function applyMove(event: PointerEvent) {
            // Re-resolve the dragged output from the live selection each frame (robust to the view
            // re-mounting), and use the gesture's CAPTURED center — never re-query the DOM element,
            // whose data-node-id lags $project by one evaluation and would freeze the gesture.
            const output = selection?.getOutput(project)[0];
            if (output === undefined) return;
            const context = project.getNodeContext(output);

            const rotating = selection?.rotationDragging;
            const sizing = selection?.sizeDragging;
            if (rotating) {
                const angle =
                    Math.atan2(
                        event.clientY - rotating.cy,
                        event.clientX - rotating.cx,
                    ) *
                    (180 / Math.PI);
                const next = rotatedOutput(
                    project,
                    output,
                    context,
                    rotating.startDegrees + (angle - rotating.startAngle),
                );
                // Skip a revise that wouldn't change the output's VALUE. rotatedOutput rounds to
                // whole degrees but always mints new node ids, so an unchanged frame produces a
                // structurally-equal project. Project.equals() (used by ProjectView to decide
                // whether to rebuild the evaluator) would then skip the rebuild, leaving the
                // rendered value's node ids stale relative to $project — which makes the on-stage
                // output unclickable and the handle vanish (it can't match the selection). Moving
                // never hits this because its position changes every frame.
                if (next && !next.isEqualTo(output))
                    Projects.revise(project, [[output, next]]);
            } else if (sizing && sizing.startDistance !== 0) {
                const distance = Math.hypot(
                    event.clientY - sizing.cy,
                    event.clientX - sizing.cx,
                );
                const next = resizedOutput(
                    project,
                    output,
                    context,
                    distance / sizing.startDistance,
                    sizing.startSize,
                );
                // Same no-op guard as rotation above: only revise (and advance the incremental
                // reference distance) when the value actually changes, or the stale-id desync
                // leaves the output stuck.
                if (next && !next.isEqualTo(output)) {
                    Projects.revise(project, [[output, next]]);
                    // A Shape scales its form per frame, so advance the reference distance;
                    // Phrase/Group resize absolutely from the fixed start distance.
                    if (resizeIsIncremental(project, output, context))
                        selection?.advanceSizing(distance);
                }
            }
        }

        // The gesture END (pointerup/pointercancel) is owned by OutputHandles, which registers it
        // synchronously on pointerdown so a quick release can't beat an async effect. This effect
        // owns only the continuous MOVE; its cleanup removes the listener when `dragging` clears.
        window.addEventListener('pointermove', schedule);
        return () => {
            window.removeEventListener('pointermove', schedule);
            if (frame !== undefined) cancelAnimationFrame(frame);
            pendingMove = undefined;
        };
    });

    /** The state of dragging the adjusted focus. A location or nothing. */
    let drag = $state<
        { startPlace: Place; left: number; top: number } | undefined
    >();

    // Coalesce body-move revises to one per animation frame (like the handle drag above). Each move
    // revise drives the whole edit pipeline, so applying every raw pointermove backs up the main
    // thread. We store the latest target place and flush it once per frame; on release we flush
    // synchronously so the final position is never dropped. Only the MOVE path is throttled — pan,
    // pinch, painting, and Pointer-stream updates stay synchronous (handled in handlePointerMove).
    let pendingMoveTarget: { x: number; y: number } | undefined;
    let moveFrame: number | undefined;

    function scheduleMove(x: number, y: number) {
        pendingMoveTarget = { x, y };
        if (moveFrame !== undefined) return;
        moveFrame = requestAnimationFrame(() => {
            moveFrame = undefined;
            flushMove();
        });
    }

    function flushMove() {
        const target = pendingMoveTarget;
        pendingMoveTarget = undefined;
        if (target === undefined) return;
        const outputs = selection?.getOutput(project) ?? [];
        if (outputs.length === 0) return;
        moveOutput(DB, project, outputs, $locales, target.x, target.y, false);
    }

    function cancelScheduledMove() {
        if (moveFrame !== undefined) cancelAnimationFrame(moveFrame);
        moveFrame = undefined;
        pendingMoveTarget = undefined;
    }

    /** A list of points gathered during a painting drag */
    let paintingPlaces = $state<{ x: number; y: number }[]>([]);
    let strokeNodeID = $state<number | undefined>();

    /* We get these functions from the stage view, if there is one. */
    let stage = $state<ReturnType<typeof StageView> | undefined>();

    // The place the output is focusing on. Bound to the stage's focus, unless set here.
    // svelte-ignore state_referenced_locally
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
    const permissionException = $derived(
        exception instanceof PermissionException ? exception : undefined,
    );

    /** Browser permissions the project references but for which the user hasn't yet made a decision. */
    const pendingPermissions = $derived(
        new Set<PermissionName>(
            [...project.getRequiredPermissions()].filter(
                (p) => $consent[p] === 'unknown',
            ),
        ),
    );

    /** Show the pre-evaluation splash only before the evaluator has started — afterwards, denial flows through the exception branch. */
    const needsPermission = $derived(
        !evaluator.isStarted() && pendingPermissions.size > 0,
    );

    function handleStart() {
        for (const permission of pendingPermissions) grantConsent(permission);
    }

    function handleRetry() {
        if (permissionException !== undefined)
            grantConsent(permissionException.permission);
        onretry?.();
    }

    /** Every time the value changes, try to parse a Stage from it. */
    const stageValue = $derived(
        value === undefined ? undefined : toStage(evaluator, value),
    );

    export function adjustZoom(dz: number) {
        stage?.adjustFocus(0, 0, dz);
    }

    export function resetZoom() {
        stage?.resetFocus();
    }

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
        blurOnTyping &&
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

    /** Keep the bindable hasStagePlace flag up to date. */
    $effect(() => {
        hasStagePlace = stageValue?.place !== undefined;
    });

    /** Keep track of streams that listen for keyboard input */
    const keys = $derived(
        $evaluation !== undefined &&
            $evaluation.evaluator.getBasisStreamsOfType(Key).length > 0,
    );
    const placements = $derived(
        $evaluation !== undefined &&
            $evaluation.evaluator.getBasisStreamsOfType(Placement).length > 0,
    );
    const chats = $derived(
        $evaluation !== undefined &&
            $evaluation.evaluator.getBasisStreamsOfType(Chat).length > 0,
    );

    // Announce changes in values.
    $effect(() => {
        if ($announce && value !== undefined) {
            // The generic `Value.getDescription` for any structure value
            // just returns the term "structure" — useless for a screen
            // reader. Prefer:
            //   - the rich, localized description for known output types
            //     (Phrase/Group/Stage/Shape/Say),
            //   - the BCT color name for Color values,
            //   - the literal text for TextValue (saying the type name
            //     "text" is uninformative; speak what the program produced).
            const output = toOutput(evaluator, value, new NameGenerator());
            const colorValue = output ? undefined : toColor(value);
            const body = exception
                ? exception.getExplanation($locales).toText()
                : output !== undefined
                  ? output.getDescription($locales)
                  : colorValue !== undefined
                    ? describeColorLocalized(
                          $locales,
                          colorValue.lightness.toNumber(),
                          colorValue.chroma.toNumber(),
                          colorValue.hue.toNumber(),
                      )
                    : value instanceof TextValue
                      ? value.text
                      : concretize(
                            $locales,
                            $locales.getPlainText(value.getDescription()),
                            {},
                        ).toText();
            // Prefix with the localized "output" term so the screen reader
            // user can tell stage-output announcements apart from editor
            // and chooser announcements.
            const description = `${$locales.getPlainText((l) =>
                getConceptName(l, 'output'),
            )} ${body}`;
            untrack(() =>
                $announce('value', $locales.getLanguages()[0], description),
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
            evaluator.singletonReact(Key, (stream) =>
                stream.react({ key: event.key, down: false }),
            );
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
        if (stage && !evaluator.isPlaying()) {
            const increment = 1;
            if (event.key === 'ArrowLeft') {
                event.stopPropagation();
                return stage.adjustFocus(1 * increment, 0, 0);
            } else if (event.key === 'ArrowRight') {
                event.stopPropagation();
                return stage.adjustFocus(-1 * increment, 0, 0);
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

        // Keyboard multi-select of outputs (paused + editable), a decoupled "toggle" model: moving
        // focus (Tab / Alt+Arrow) never changes the selection; Space toggles the focused output in or
        // out; Enter selects ONLY the focused output and opens the palette; Escape clears; Cmd/Ctrl+A
        // selects all. Never mutate the selection mid handle-drag (mirrors selectPointerOutput).
        if (
            !evaluator.isPlaying() &&
            editable &&
            selection &&
            !selection.dragging
        ) {
            const lang = $locales.getLanguages()[0];

            // Escape clears the whole selection (works even when focus is on the stage container).
            if (event.key === 'Escape' && !command && !shift) {
                if (!selection.isEmpty()) {
                    selection.empty();
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            $locales.getPlainText((l) => l.ui.output.cleared),
                        );
                    event.stopPropagation();
                    return;
                }
            }

            // Cmd/Ctrl+A selects every selectable output on stage.
            if (event.key === 'a' && command && !shift) {
                const all = getFocusableOutput()
                    .map((el) =>
                        getOutputNodeFromID(getOutputNodeIDFromElement(el)),
                    )
                    .filter((e): e is Evaluate => e !== undefined);
                if (all.length > 0) {
                    selection.selectAll(project, all);
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            $locales
                                .concretize((l) => l.ui.output.allSelected, {
                                    count: all.length,
                                })
                                .toText(),
                        );
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }

            const evaluate = getOutputNodeFromID(getOutputNodeIDFromFocus());
            if (evaluate !== undefined) {
                // Use the output's description (its aria-label) for recognizability — data-name is an
                // internal id. Read before any toggle so a group's "selected" name suffix isn't echoed.
                const name =
                    document.activeElement instanceof HTMLElement
                        ? (document.activeElement.getAttribute('aria-label') ??
                          '')
                        : '';

                // Space toggles the focused output's membership in the selection.
                if (event.key === ' ' && !command && !shift) {
                    selection.toggle(project, evaluate);
                    const nowSelected = selection.includes(evaluate, project);
                    const count = selection.getOutput(project).length;
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            nowSelected
                                ? $locales
                                      .concretize((l) => l.ui.output.selected, {
                                          name,
                                          count,
                                      })
                                      .toText()
                                : $locales
                                      .concretize(
                                          (l) => l.ui.output.deselected,
                                          { name, count },
                                      )
                                      .toText(),
                        );
                    // Suppress page scroll AND the role=button activation the leaf would otherwise fire.
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                // Enter selects only the focused output and opens the palette. (A sole-selected phrase
                // consumes Enter for text editing in PhraseView before it reaches here.)
                if (event.key === 'Enter' && !command && !shift) {
                    selection.setPaths(project, [evaluate], 'output');
                    selection.setPhrase(null);
                    revealPalette?.();
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            $locales
                                .concretize((l) => l.ui.output.selectedOnly, {
                                    name,
                                })
                                .toText(),
                        );
                    event.stopPropagation();
                    return;
                }

                // Cmd/Ctrl+Backspace deletes the focused output.
                if (event.key === 'Backspace' && command) {
                    Projects.revise(project, [[evaluate, undefined]]);
                    event.stopPropagation();
                    return;
                }
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
            evaluator.singletonReact(Key, (stream) =>
                stream.react({ key: event.key, down: true }),
            );

            // Announce the key pressed
            if ($announce)
                $announce('keyinput', $locales.getLanguages()[0], event.key);

            // Map keys onto axes of change for any Placement streams.
            if (
                event.key.startsWith('Arrow') ||
                event.key === '-' ||
                event.key === '='
            ) {
                evaluator.singletonReact(Placement, (stream) =>
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
        evaluator.singletonReact(Chat, (stream) => stream.react(message));
    }

    function handleWheel(event: WheelEvent) {
        if (stage && (wheel || event.shiftKey)) {
            stage.adjustFocus(0, 0, -event.deltaY / PX_PER_METER);
            event.preventDefault();
        }
    }

    /**
     * When the pointer is pressed down:
     * 1) Focus on the keyboard input if there is any
     * 2) Record a button down event if there is a button stream
     * 3) Reset the selection if not playing
     * 4) Send a placement navigation event based on the position of the pointer if there is a placement stream
     * 5) Initiate an output drag
     * */
    function handlePointerDown(event: PointerEvent) {
        // Add event to pointer event cache for
        pointersByIndex.push(event);

        // A second pointer turns this into a pinch gesture, so abandon any in-progress pan.
        if (pointersByIndex.length >= 2) drag = undefined;

        // Focus the keyboard input if it exists.
        if (keyboardInputView) {
            setKeyboardFocus(
                keyboardInputView,
                'Focusing output text field on pointer down.',
            );
            event.stopPropagation();
            event.preventDefault();
        } else if (valueView) {
            setKeyboardFocus(valueView, 'Focusing on stage');
        }

        // If the evaluator is playing, record button events.
        if (evaluator.isPlaying()) {
            evaluator.singletonReact(Button, (stream) => stream.react(true));

            // Was the target clicked on output with a name? Add it to choice streams.
            if (event.target instanceof HTMLElement) {
                const output = event.target.closest('.output');
                if (output instanceof HTMLElement) recordSelection(event);
            }
        }
        // If we're editable and not playing, select output.
        else if (editable) {
            if (painting) {
                if (selection) selection.setPaths(project, [], 'output');
            } else if (!selectPointerOutput(event)) {
                ignore();
            }
        }

        // If there's a Placement, send it some navigation events based on position.
        if (valueView && stageValue) {
            evaluator.singletonReact(Placement, (placement) => {
                // First, find the output on stage that this placement is placing,
                // so we can find the position of the pointer relative to the output.
                const latest = placement.latest();
                const output =
                    stageValue.find(
                        (output) => output.place?.value === latest,
                    ) ??
                    (stageValue.place?.value === latest
                        ? stageValue
                        : undefined);
                // Couldn't find the output? Move to the next one.
                if (output === undefined) return;

                // Now find the view of the output.
                const outputView =
                    output === stageValue
                        ? valueView
                        : valueView?.querySelector(
                              `[data-id="${output.getHTMLID()}"]`,
                          );
                // Couldn't find the view? Move on to the next one.
                if (!outputView) return;

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

                const xDirection =
                    angle < 90 - threshold || angle > 270 + threshold
                        ? 1
                        : angle > 90 + threshold && angle < 270 - threshold
                          ? -1
                          : 0;

                const yDirection =
                    angle > threshold && angle < 180 - threshold
                        ? 1
                        : angle > 180 + threshold && angle < 360 - threshold
                          ? -1
                          : 0;

                // Divide the 360 degrees into 45 degree segments
                // Send the navigation directions to all all of the placements.
                placement.react({
                    x: xDirection,
                    y: yDirection,
                    z: 0,
                });
            });
        }

        // If there's a focus, start dragging — but only when editable. Dragging to pan the
        // view (or move a selected output) is an editing affordance; read-only stages like
        // how-to previews shouldn't pan on drag.
        if (editable && valueView && renderedFocus) {
            const output = selection?.getOutput(project) ?? [];

            // Whether this drag will MOVE a selected output (a non-Stage output, while paused
            // and editable) versus PAN the focus. Mirrors the decision in handlePointerMove —
            // it must agree so the drag's start place matches the gesture. A selected Stage (or
            // empty/playing) pans, so its start place is the rendered focus, NOT the Stage's
            // own place; panning then only moves x/y and retains the focus's z.
            const selectedOutput = output[0];
            const movable =
                !evaluator.isPlaying() &&
                selectedOutput !== undefined &&
                !selectedOutput.is(
                    project.shares.output.Stage,
                    project.getNodeContext(selectedOutput),
                );

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
            const place =
                // If painting, the start place is where the click was
                painting
                    ? new Place(
                          renderedFocus.value,
                          mx - renderedFocus.x,
                          my + renderedFocus.y,
                          0,
                      )
                    : // If moving a selected output, start from its place.
                      movable
                      ? getOrCreatePlace(
                            project,
                            $locales,
                            selectedOutput,
                            evaluator.project.getNodeContext(selectedOutput),
                        )
                      : // Otherwise we're panning: start from the rendered focus.
                        renderedFocus;

            if (place) {
                fit = false;
                drag = {
                    startPlace: place,
                    left: dx,
                    top: dy,
                };
                // Mark an on-stage gesture in progress when this drag will MOVE an output (not a pan
                // or paint), so ProjectView can defer conflict/concept-index work until release.
                if (movable) selection?.setInteracting(true);
                // Reset the painting places
                paintingPlaces = [];
                strokeNodeID = undefined;
            }
        }
    }

    /**
     * When the pointer moves:
     * 1) If we're pinching, zoom in and out based on the change in distance between the two pointers.
     * 2) If we're panning, pan
     * 3) If there's a Pointer stream, send a new point
     */
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
            // Find the Euclidean distance between the two pointers
            const currentPointerDifference = Math.hypot(
                pointersByIndex[0].clientX - pointersByIndex[1].clientX,
                pointersByIndex[0].clientY - pointersByIndex[1].clientY,
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

        // POINTER PANNING AND ZOOMING

        // Handle focus or output moves.. but NOT while a rotation/size handle drag is in
        // progress — the handle owns that gesture, and moving/panning here would revise the
        // project concurrently, breaking the selection path (and crashing on an empty one).
        if (
            pointersByIndex.length < 2 &&
            event.buttons === 1 &&
            drag &&
            renderedFocus &&
            !selection?.rotationDragging &&
            !selection?.sizeDragging
        ) {
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
                    // Decide: move a selected movable output, or pan the stage focus.
                    // A "movable" output is a non-Stage output selected while paused and
                    // editable. Everything else — an empty selection, a selected Stage, or
                    // play mode (read-only) — falls through to panning. This is what lets the
                    // audience click to SELECT the Stage and still drag to PAN it during a
                    // pause, and keeps panning (but not editing) available during play.
                    const outputs = selection?.getOutput(project) ?? [];
                    const selected = outputs[0];
                    const movable =
                        editable &&
                        !evaluator.isPlaying() &&
                        selected !== undefined &&
                        !selected.is(
                            project.shares.output.Stage,
                            project.getNodeContext(selected),
                        );
                    if (movable) {
                        // Show the grid, for clarity on positioning.
                        grid = true;
                        // Defer the revise to one-per-frame (flushed on release); the latest target
                        // wins. Resolves the outputs fresh at flush time (robust to re-mount).
                        scheduleMove(newX, newY);
                        event.stopPropagation();
                    } else if (stage) {
                        const scale = rootScale(0, renderedFocus.z);
                        // Scale down the mouse delta and offset by the drag starting point.
                        stage.setFocus(
                            renderedDeltaX / scale + drag.startPlace.x,
                            renderedDeltaY / scale + drag.startPlace.y,
                            drag.startPlace.z,
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

                evaluator.singletonReact(Pointer, (stream) =>
                    stream.react(position),
                );
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

        // Apply the final pending move synchronously so release never drops the last frame, then
        // cancel any scheduled frame. Done before clearing `interacting` so the deferred conflict /
        // concept-index work (gated on it in ProjectView) flushes once against the final project.
        flushMove();
        cancelScheduledMove();

        drag = undefined;
        paintingPlaces = [];
        strokeNodeID = undefined;
        selection?.setInteracting(false);

        if (evaluator.isPlaying())
            evaluator.singletonReact(Button, (stream) => stream.react(false));
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
     * Given a pointer event, finds the nearest output under the mouse and adds it to the project selection
     * if so.
     */
    function selectPointerOutput(event: PointerEvent | MouseEvent): boolean {
        if (selection === undefined) return false;
        // Never change the selection while a handle drag is in progress — the drag depends on it.
        if (selection.dragging) return true;
        // If we found the node in the project, add it to the selection.
        const evaluate = getOutputNodeFromID(
            getOutputNodeIDUnderPointer(event),
        );
        if (evaluate) {
            // If the shift key is down
            let newSelection: Evaluate[];
            if (event.shiftKey) {
                const output = selection.getOutput(project);
                const index = output.indexOf(evaluate);
                // If it's in the set, remove it.
                if (index >= 0) {
                    newSelection = [
                        ...output.slice(0, index),
                        ...output.slice(index + 1),
                    ];
                } else {
                    newSelection = [...output, evaluate];
                }
            }
            // Otherise, set the selection to the selection.
            else newSelection = [evaluate];

            // Update the selection
            selection.setPaths(project, newSelection, 'output');
            // Erase the selected phrase.
            selection.setPhrase(null);

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
        // Nothing under the pointer: select the explicit Stage (so it's still editable in
        // the palette), or clear when the stage is implicit and has no node to select.
        else if (
            stageValue?.explicit &&
            stageValue.value.creator instanceof Evaluate
        )
            selection.setPaths(project, [stageValue.value.creator], 'output');
        else selection.setPaths(project, [], 'output');

        return true;
    }

    /** Double-click selects the output under the pointer and explicitly opens the palette for it.
     *  (A phrase consumes dblclick for text editing before this fires, so this applies to shapes,
     *  groups, and the stage.) Read-only during play. */
    function handleDoubleClick(event: MouseEvent) {
        if (evaluator.isPlaying() || !editable) return;
        selectPointerOutput(event);
        revealPalette?.();
    }

    function pixelsToMeters(mx: number, my: number, z: number, focusZ: number) {
        const scale = rootScale(z, focusZ);
        return { x: mx / PX_PER_METER / scale, y: my / PX_PER_METER / scale };
    }

    function twoDigits(num: number): number {
        return Math.round(100 * num) / 100;
    }

    function getOutputNodeIDUnderPointer(
        event: PointerEvent | MouseEvent,
    ): number | undefined {
        // Find the nearest .output element and get its node-id data attribute.
        // Accept any Element here, not just HTMLElement: clicks landing on
        // inline SVG (e.g. a custom character glyph rendered by CharacterView)
        // return SVGElements, which still support .closest() and walk up to
        // the enclosing .phrase div correctly.
        const element = document.elementFromPoint(event.clientX, event.clientY);
        return getOutputNodeIDFromElement(element?.closest('.output') ?? null);
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
            evaluator.singletonReact(Choice, (stream) =>
                stream.react(selection),
            );
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

    // Collect all Say outputs from the stage each evaluation.
    let says = $derived(stageValue?.getSays() ?? []);

    // Index of the utterance currently being spoken; -1 when nothing is playing.
    let speakingIndex = $state(-1);

    // Speak the queued Say outputs whenever the list changes (i.e., each evaluation).
    $effect(() => {
        const currentSays = says;
        speakingIndex = -1;

        if (typeof speechSynthesis === 'undefined' || currentSays.length === 0)
            return;

        speechSynthesis.cancel();

        const lang = $locales.getLanguages()[0];
        const currentVoiceURI = $voice;

        // Build all utterances up front so onend closures can reference them.
        const utterances = currentSays.map((say, i) => {
            const u = new SpeechSynthesisUtterance(say.text.text);
            u.lang = say.text.language?.getBCP47() ?? lang;
            if (currentVoiceURI) {
                const v = speechSynthesis
                    .getVoices()
                    .find((v) => v.voiceURI === currentVoiceURI);
                if (v) u.voice = v;
            }
            u.onstart = () => {
                speakingIndex = i;
            };
            u.onend = () => {
                speakingIndex = -1;
                if (i + 1 < utterances.length)
                    speechSynthesis.speak(utterances[i + 1]);
            };
            return u;
        });

        speechSynthesis.speak(utterances[0]);

        return () => speechSynthesis.cancel();
    });

    onDestroy(() => {
        if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    });
</script>

<section
    class="output"
    data-testid="output"
    data-uiid="stage"
    role="group"
    aria-label={$locales.getPlainText((l) => l.ui.output.label)}
    aria-describedby={$evaluation?.playing === false && !painting && editable
        ? 'output-multiselect-help'
        : null}
    class:mini
    class:editing={$evaluation?.playing === false && !painting && editable}
    class:selected={stageValue &&
        stageValue.explicit &&
        stageValue.value.creator instanceof Evaluate &&
        selection !== undefined &&
        selection.includes(stageValue.value.creator, project)}
>
    {#if $evaluation?.playing === false && !painting && editable}
        <span id="output-multiselect-help" class="multiselect-help"
            ><LocalizedText path={(l) => l.ui.output.multiselect} /></span
        >
    {/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="value"
        class:ignored
        class:typing
        tabIndex="0"
        bind:this={valueView}
        onkeydown={interactive ? handleKeyDown : null}
        onkeyup={interactive ? handleKeyUp : null}
        ondblclick={interactive ? handleDoubleClick : null}
        onwheel={interactive ? handleWheel : null}
        onpointerdown={(event) => {
            event.stopPropagation();
            if (interactive) handlePointerDown(event);
        }}
        onpointerup={interactive ? handlePointerUp : null}
        onpointermove={interactive ? handlePointerMove : null}
        onpointerleave={interactive ? handlePointerLeave : null}
    >
        <!-- If the project needs permission and evaluation hasn't started, show the splash. -->
        {#if needsPermission}
            <PermissionSplash
                permissions={pendingPermissions}
                onstart={handleStart}
                {mini}
            />
            <!-- If there's an exception, show that. -->
        {:else if exception !== undefined}
            <div class="message exception" class:mini data-uiid="exception"
                >{#if mini}!{:else}<Speech
                        eyes
                        character={index?.getNodeConcept(exception.creator) ??
                            exception.creator.getCharacter($locales)}
                        invert
                    >
                        {#snippet content()}
                            <MarkupHTMLView
                                markup={{
                                    perLocale: (l) =>
                                        exception.getExplanation(l),
                                }}
                            />
                            {#if permissionException !== undefined && onretry !== undefined}
                                <div class="permission-retry">
                                    <ButtonUI
                                        tip={(l) =>
                                            l.ui.output.permission.retry}
                                        action={handleRetry}
                                        background
                                        testid="permission-retry"
                                    >
                                        <LocalizedText
                                            path={(l) =>
                                                l.ui.output.permission.retry}
                                        />
                                    </ButtonUI>
                                </div>
                            {/if}
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
                    <h2><LocalizedText path={value.getDescription()} /></h2>
                    <ValueView {value} inline={false} />
                {/if}
            </div>
            <!-- Otherwise, show the Stage -->
        {:else}
            <StageView
                {project}
                {evaluator}
                stage={stageValue}
                background
                bind:fit
                bind:grid
                bind:painting
                bind:this={stage}
                bind:renderedFocus
                bind:focusOverridden
                interactive={!mini}
                {editable}
            />
        {/if}
        {#if says.length > 0 || handLandmarkerStatus.loading}
            <div class="say-overlay" aria-live="polite" aria-atomic="false">
                {#if handLandmarkerStatus.loading}
                    <span
                        class="say-item hand-loading"
                        title="Loading hand tracker…"
                        aria-label="Loading hand tracker"
                        >{withMonoEmoji('🖐')}</span
                    >
                {/if}
                {#each says as say, i (say.text.text + i)}
                    <span
                        class="say-item"
                        title={say.text.text}
                        aria-label={say.text.text}
                        >{i < speakingIndex
                            ? withMonoEmoji('🔇')
                            : i === speakingIndex
                              ? withMonoEmoji('🔊')
                              : withMonoEmoji('🔈')}</span
                    >
                {/each}
            </div>
        {/if}
        <!-- These streams need keyboard input, so we make a text input field. If there's a chat stream, we make it visible. -->
        {#if keys || placements || chats}
            <div class="keyboard" class:visible={chats}>
                <input
                    type="text"
                    class="keyboard-input"
                    placeholder={chats
                        ? $locales.getPlainText(
                              (l) => l.ui.output.field.key.placeholder,
                          )
                        : null}
                    data-defaultfocus
                    aria-autocomplete="none"
                    aria-label={$locales.getPlainText(
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
                        tip={(l) => l.ui.output.button.submit}
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

    /* Visually-hidden screen-reader instructions for keyboard multi-select. */
    .multiselect-help {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        width: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
    }

    .output:focus-within {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    .output.editing.selected {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-highlight-color);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    /* Unified on-stage selection feedback for Phrase / Shape / Group, shown only
       when paused (.editing) and interactive. Centralized here so the three views
       can't drift apart. No outline-offset: the outline draws outside the box so an
       opaque Shape fill can't paint over it. */
    :global(.stage.editing.interactive .phrase.selected),
    :global(.stage.editing.interactive .shape.selected),
    :global(.stage.editing.interactive .group.selected) {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-highlight-color);
    }

    :global(.stage.editing.interactive .phrase:not(.selected)),
    :global(.stage.editing.interactive .shape:not(.selected)),
    :global(.stage.editing.interactive .group:not(.selected):not(.root)) {
        outline: var(--wordplay-focus-width) dotted
            var(--wordplay-inactive-color);
    }

    /* A keyboard-focused output shows a SOLID focus ring drawn with box-shadow (a different property
       than the selection/selectable dotted `outline` above) so the two coexist — a focused AND
       selected output shows both. The focus ring sits just outside the outline, separated by a thin
       background-colored gap, so they read as distinct concentric rings. box-shadow (like the
       outline) draws outside the box, so an opaque Shape fill can't paint over it. */
    :global(.stage.editing.interactive .phrase:focus-visible),
    :global(.stage.editing.interactive .shape:focus-visible),
    :global(.stage.editing.interactive .group:focus-visible:not(.root)) {
        box-shadow:
            0 0 0 var(--wordplay-focus-width) var(--wordplay-background),
            0 0 0 calc(2 * var(--wordplay-focus-width))
                var(--wordplay-focus-color);
    }

    /* Move cursor signals draggability (but not while editing a phrase's text). */
    :global(.stage.editing.interactive .phrase.selected:not(.entered)),
    :global(.stage.editing.interactive .shape.selected),
    :global(.stage.editing.interactive .group.selected) {
        cursor: move;
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
        transition-duration: calc(var(--animation-factor) * 250ms);

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

    .permission-retry {
        margin-top: 0.75em;
        display: flex;
        justify-content: flex-start;
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

    .say-overlay {
        position: absolute;
        top: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: calc(var(--wordplay-spacing) / 2);
        pointer-events: none;
        z-index: 1;
    }

    .say-item {
        /* White + mix-blend-mode: difference inverts the indicator against
           whatever is rendered behind it — visible against any stage
           background color (white, black, or anywhere in between). */
        color: white;
        mix-blend-mode: difference;
        font-size: 1em;
        line-height: 1;
        user-select: none;
    }

    .hand-loading {
        animation: hand-loading-spin 1.5s linear infinite;
        display: inline-block;
        transform-origin: center;
    }

    @keyframes hand-loading-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
