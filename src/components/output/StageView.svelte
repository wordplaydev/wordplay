<script module lang="ts">
    const HalfGridlineThickness = 0.1;
</script>

<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
    import { fontsLoadedGeneration, loadedFonts } from '@basis/faces/Fonts';
    import type Project from '@db/projects/Project';
    import Animator, {
        type Moved,
        type OutputInfoSet,
    } from '@output/animation/Animator';
    import Group from '@output/Output/Group';
    import {
        boundZoom,
        composeZoom,
        contentVisibility,
        refit,
        responsiveZ,
        zoomBySteps,
        zoomByWheel,
        zoomPercent,
        type Box,
    } from '@components/output/fit';
    import {
        PX_PER_METER,
        getColorCSS,
        getFaceCSS,
        getOpacityCSS,
        getSizeCSS,
    } from '@output/Output/outputToCSS';
    import Phrase from '@output/Output/Phrase';
    import Place, { createPlace } from '@output/Place/Place';
    import RenderContext from '@output/RenderContext';
    import type Stage from '@output/Output/Stage';
    import { DefaultSize, toOverlayStage } from '@output/Output/Stage';
    import type Evaluator from '@runtime/Evaluator';
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import {
        animationFactor,
        locales,
        musicVisualization,
        writingLayout,
    } from '@db/Database';
    import LightShow from '@components/output/LightShow.svelte';
    import Mood from '@components/output/Mood.svelte';
    import Sheet from '@components/output/Sheet.svelte';
    import MusicView from '@components/output/MusicView.svelte';
    import type Output from '@output/Output/Output';
    import range from '@util/range';
    import {
        getAnimatingNodes,
        getAnnouncer,
        getEvaluation,
        getSelectedOutput,
        getStageScene,
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
        /** Whether the creator can select output for inspection (edit or debug mode).
         * Defaults to editable, so read-only stages behave as before. */
        inspectable?: boolean;
        fit: boolean;
        grid: boolean;
        painting: boolean;
        background: boolean;
        /** The camera actually rendered: the program's or the platform's base focus, with the
         * audience's pan/zoom offset composed onto it. Read by OutputView for hit testing. */
        renderedFocus: Place;
        /** Reflects whether the audience has panned or zoomed away from the base focus. */
        focusAdjusted?: boolean;
        /** The audience's zoom, as a ratio of the base camera's scale; 1 is the base. */
        zoom?: number;
        /** Whether the audience's own pan or zoom has put all of the content off the
         * stage, so the view can offer them a way back. */
        contentHidden?: boolean;
        /** Whether this is a thumbnail-sized preview, which opts out of the automatic
         * pull-back on small viewports — a thumbnail is small on purpose. */
        mini?: boolean;
        /** Whether this stage's colors are being flipped for a dark canvas.
         * Decided by OutputView, since it owns the run this is latched to. */
        adapting?: boolean;
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
        focusAdjusted = $bindable(false),
        zoom = $bindable(1),
        contentHidden = $bindable(false),
        mini = false,
        adapting = false,
    }: Props = $props();

    const evaluation = getEvaluation();

    // The music on this stage. The renderings want it two ways: the light
    // show only needs the names to look up what's sounding, while the
    // orchestra and the mood cloud read the music itself.
    let stageMusic = $derived(stage.getMusic());
    let musicNames = $derived(stageMusic.map((music) => music.getName()));
    const animatingNodes = getAnimatingNodes();

    const GRID_PADDING = 10;

    /** Half the snap lattice, so a move can see the lines it can land between. */
    const HALF_GRID = 0.5;
    /** How far a guide pokes past the outputs it relates, in metres, so it reads
     *  as a line drawn through them rather than an edge of one of them. */
    const GUIDE_OVERSHOOT = 0.25;

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

    // Publish a way to lay out what's on stage, which is what anything moving
    // output lines up against (#117). Done from here because this is where the
    // stage and its render context live. Handed over as a function so the walk
    // happens when a move begins rather than on every render, and it goes
    // through `Animator.layout` so guides are placed by exactly the same
    // algorithm the renderer places output with.
    const stageScene = getStageScene();
    $effect(() => {
        const currentAnimator = animator;
        const currentStage = stage;
        const currentContext = context;
        stageScene?.set(
            () =>
                currentAnimator?.layout(
                    currentStage,
                    [],
                    new Map(),
                    currentContext,
                ) ?? new Map(),
        );
    });

    // Whether output is being moved, and what it is lined up with (#117). Both
    // come from the shared selection state rather than props: the gesture that
    // owns the move is sometimes OutputView (a pointer drag) and sometimes an
    // individual output view (the arrow keys), and neither is an ancestor here.
    let moving = $derived(editable && (selectedOutput?.moving ?? false));
    let guides = $derived(moving ? (selectedOutput?.guides ?? []) : []);
    // The grid is drawn faintly during a move for positioning clarity, even when
    // the creator has it off — but only its own toggle makes moving snap to it.
    let showGrid = $derived(grid || moving);

    /** The framing box the auto-fit camera fits. It only ever grows, so it settles instead
     *  of chasing moving content. Reset whenever the evaluator changes; see resetAnimator's
     *  effect. */
    let framing: Box | undefined = $state(undefined);

    /** The verse focus that fits the framing box to the view. */
    let fitFocus: Place | undefined = $state(undefined);

    /** Whether the camera has a frame it was already pointing at. Until it does, a change
     *  isn't a camera move, so it snaps rather than eases; see the focus effect below. */
    let focusStarted = false;

    /** The audience's pan/zoom: metres of pan, and a *ratio* of the base camera's scale for
     *  zoom. Composing rather than replacing is what lets a viewer zoom out of a project that
     *  moves its own camera without freezing it; a ratio rather than a distance is what makes
     *  their adjustment mean the same thing before and after that camera moves. */
    let offset = $state({ x: 0, y: 0, zoom: 1 });

    /** How long the content must stay out of view before the stage says so. Long enough that
     *  a pinch passing through a hidden state doesn't flash a message. */
    const HiddenDelay = 400;

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
        if (
            focusRAF !== undefined &&
            typeof cancelAnimationFrame !== 'undefined'
        )
            cancelAnimationFrame(focusRAF);
    });

    /** Keep track of the tile view's content window size for use in fitting content to the window */
    let parent: Element | null = $state(null);
    let observer: ResizeObserver | null = $state(null);
    let viewportWidth = $state(0);
    let viewportHeight = $state(0);
    let changed = $state(false);

    /** Nudge the audience's pan. Relative, so it rides on top of a moving base focus
     *  instead of replacing it. */
    export const adjustFocus = (dx: number, dy: number) => {
        setOffset(offset.x + dx, offset.y + dy, offset.zoom);
    };

    /** Zoom by whole clicks; positive is in, negative is out. */
    export const zoomSteps = (steps: number) => {
        setOffset(
            offset.x,
            offset.y,
            zoomBySteps(zoomLimits, offset.zoom, steps),
        );
    };

    /** Zoom by a wheel or trackpad delta. */
    export const zoomWheel = (deltaY: number, deltaMode: number) => {
        setOffset(
            offset.x,
            offset.y,
            zoomByWheel(zoomLimits, offset.zoom, deltaY, deltaMode),
        );
    };

    /** Set the audience's pan/zoom outright, for gestures that anchor at their start. The
     *  zoom is bounded here, where it is stored, so the store and the picture can never
     *  disagree — but writing is only half of it, since the bound itself moves whenever the
     *  camera or the content does. See the re-bounding effect below. */
    export const setOffset = (x: number, y: number, zoom: number) => {
        offset = { x, y, zoom: boundZoom(zoomLimits, zoom) };
    };

    /** The audience's pan/zoom at the start of a gesture, so a drag or pinch can anchor. */
    export const getOffset = () => offset;

    /** Hand the camera back to the program or the platform. The framing envelope
     *  goes with the offset: handing the camera back means the platform frames
     *  the content afresh rather than against a box the audience's own view was
     *  composed with. (This button is only active once the audience has panned or
     *  zoomed; restarting the performance is what reframes otherwise.) */
    export const resetFocus = () => {
        offset = { x: 0, y: 0, zoom: 1 };
        framing = undefined;
    };

    let editing = $derived($evaluation?.playing === false);

    /** Whether the stage should describe itself, matching the condition
     *  OutputView uses for value announcements. */
    let speaking = $derived(
        $evaluation?.playing === true || $evaluation?.mode === 'debug',
    );

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
    //
    // The framing envelope deliberately survives this. Every edit builds a new
    // evaluator — a drag builds one per animation frame — and clearing the box
    // here meant refitting the *instantaneous* bounds each time, which is exactly
    // the camera-chasing that growEnvelope exists to prevent (moving one phrase
    // made the stage dolly in and out under the creator's hand). A new evaluator
    // is not a new scene; a new performance is, and that is where the box is
    // started over, below.
    $effect(() => {
        evaluator;
        // Previous scene? Stop it.
        untrack(() => {
            resetAnimator();
        });
    });

    /** The performance the scene belongs to. A new one is a new scene — every
     *  output enters again — while pausing and playing within one only holds the
     *  scene and lets it go. */
    let animatedPerformance: number | undefined = undefined;

    // Follow the evaluation: hold the scene while paused, continue it on play,
    // and start a fresh one only when a new performance begins.
    $effect(() => {
        if (animator === undefined || $evaluation === undefined) return;
        const performance = $evaluation.performance;
        const playing = $evaluation.playing;
        untrack(() => {
            if (animator === undefined) return;
            // A new performance means the creator asked to watch the program
            // again, so entrances play again. Pausing is not that.
            if (performance !== animatedPerformance) {
                animatedPerformance = performance;
                resetAnimator();
                // The program is being watched again from the top, so the box the
                // camera grew no longer describes anything. This is the one thing
                // that is a new scene; an ordinary edit is not.
                framing = undefined;
                if (!playing) {
                    animator?.suspend();
                    overlayAnimator?.suspend();
                }
                return;
            }
            if (playing) {
                if (animator.isStopped()) resetAnimator();
                else {
                    animator.resume();
                    overlayAnimator?.resume();
                }
            } else {
                animator.suspend();
                overlayAnimator?.suspend();
            }
        });
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
            // Measure empty output only where a creator can act on it — the same
            // condition the selection chrome uses, so a placeholder never appears
            // without a palette to edit it in.
            $evaluation?.playing === false && !painting && inspectable,
            adapting,
        );
    });

    /** The stage background as it is actually painted, which is what the grid
     *  and the color scheme have to agree with. */
    let renderedBack = $derived(stage.back.adapted(adapting));

    /** The color scheme this canvas is, so the theme tokens output falls back to
     *  — the stage's own foreground, a Shape's untinted fill, a Group's frame —
     *  resolve against the canvas rather than the UI around it. Derived from
     *  the painted background, so a project that authors a dark background gets
     *  dark-mode tokens even in a light UI with adaptation off. Null when the
     *  stage isn't painting a background, so it inherits. */
    let scheme = $derived(
        background
            ? renderedBack.lightness.greaterThan(0.5)
                ? 'light'
                : 'dark'
            : null,
    );
    let contentBounds = $derived(stage.getLayout(context));

    /** Permanently disable autofit when the user starts a palette edit, so the
     *  stage doesn't snap back to fit after the gesture ends. */
    $effect(() => {
        if (selectedOutput?.adjusting)
            untrack(() => {
                fit = false;
            });
    });

    /** When the stage or viewport changes, grow the framing box and refit to it.
     *  Fitting a box that only grows rather than the instantaneous bounds is what stops
     *  the camera chasing moving content; see growEnvelope.
     *
     *  Held still for the whole of an on-stage gesture, the way it already is for a
     *  palette one: a creator placing something by hand is framing the stage
     *  themselves, and a camera that moves under the thing being dragged fights
     *  them. `moving` also covers the arrow keys and outlasts them by a moment, so
     *  a held key refits once at the end rather than on every repeat. When the
     *  gesture ends these flip and the camera refits exactly once.
     *
     *  The content bounds are read *tracked* so that content arriving after the stage
     *  first renders is framed too — a @Camera's first frame is empty, so a stage fit only
     *  at startup is a stage fit to nothing. Everything this effect writes is read inside
     *  untrack, so it can't feed itself. */
    $effect(() => {
        if (
            view &&
            fit &&
            !selectedOutput?.adjusting &&
            !selectedOutput?.interacting &&
            !selectedOutput?.moving
        ) {
            // Leave some padding on the edges.
            const availableWidth = viewportWidth * (3 / 4);
            const availableHeight = viewportHeight * (3 / 4);

            const bounds = {
                left: contentBounds.left,
                right: contentBounds.right,
                top: contentBounds.top,
                bottom: contentBounds.bottom,
            };

            const next = untrack(() =>
                refit(
                    framing,
                    bounds,
                    availableWidth,
                    availableHeight,
                    fitFocus,
                ),
            );

            // Neither the frame nor the fit moved, so leave the focus alone: a new one
            // every frame restarts the camera's ease and re-renders everything reading it.
            if (next === undefined) return;

            framing = next.framing;

            // The first frame with any extent is the opening shot rather than a camera
            // move, so snap to it instead of panning there from an empty stage.
            if (next.opening) focusStarted = false;

            if (next.focus !== undefined)
                fitFocus = createPlace(
                    evaluator,
                    next.focus.x,
                    next.focus.y,
                    next.focus.z,
                );
        }
    });

    /** The camera the program or the platform wants, before the audience's adjustment.
     *  A program @Place wins over fitting; otherwise the platform frames the content.
     *  A program's z is pulled back on viewports smaller than it was authored for, so a
     *  narrow screen still shows what the creator framed. */
    let baseFocus = $derived.by(() => {
        if (stage.place) {
            const place = stage.place.flipX();
            if (mini) return place;
            const z = responsiveZ(place.z, viewportWidth, viewportHeight);
            return z === place.z
                ? place
                : createPlace(evaluator, place.x, place.y, z);
        }
        return fitFocus ?? createPlace(evaluator, 0, 0, -12);
    });

    /** Ease the base camera over the stage's duration, so a moving camera pans smoothly
     *  instead of snapping — matching how every other output animates its place change.
     *  Only while playing: a creator editing wants the frame to track their edits crisply,
     *  and the audience's own pan/zoom is applied instantly on top either way. */
    let easeFocus = $derived($evaluation?.playing === true);

    let focusRAF: number | undefined = undefined;
    let lastFocusFrame: number | undefined = undefined;

    /** The eased base camera. The audience's offset is composed onto this, never eased,
     *  so panning and zooming stay responsive while a program's camera still pans smoothly. */
    let renderedBase: Place = $state(createPlace(evaluator, 0, 0, -12));

    /** Compose the audience's pan/zoom onto a base camera, bounded at both ends: how near
     *  they may come follows the nearest thing on stage, and how far out they may go is
     *  capped so home stays a countable number of clicks away. */
    function compose(base: Place) {
        const z = composeZoom(
            { baseZ: base.z, nearestContentZ: contentBounds.nearest },
            offset.zoom,
        );
        return offset.x === 0 && offset.y === 0 && z === base.z
            ? base
            : createPlace(evaluator, base.x + offset.x, base.y + offset.y, z);
    }

    function stepFocus() {
        focusRAF = undefined;
        const target = baseFocus;
        const duration = (stage.duration ?? 0) * $animationFactor;
        if (!easeFocus || duration <= 0) {
            lastFocusFrame = undefined;
            renderedBase = target;
            return;
        }
        const now = performance.now();
        const dt =
            lastFocusFrame === undefined ? 0 : (now - lastFocusFrame) / 1000;
        lastFocusFrame = now;
        // Exponential approach: ~99% of the way there after `duration` seconds,
        // frame-rate independent, with a natural decelerating (ease-out) feel.
        const alpha = dt <= 0 ? 0 : 1 - Math.exp((-5 * dt) / duration);
        const nx = renderedBase.x + (target.x - renderedBase.x) * alpha;
        const ny = renderedBase.y + (target.y - renderedBase.y) * alpha;
        const nz = renderedBase.z + (target.z - renderedBase.z) * alpha;
        // Landed on every axis? Snap exactly and stop the loop.
        if (
            Math.abs(target.x - nx) < 0.001 &&
            Math.abs(target.y - ny) < 0.001 &&
            Math.abs(target.z - nz) < 0.001
        ) {
            lastFocusFrame = undefined;
            renderedBase = target;
            return;
        }
        renderedBase = createPlace(evaluator, nx, ny, nz);
        focusRAF = requestAnimationFrame(stepFocus);
    }

    /** When the base focus or ease conditions change, snap or kick the ease
     *  loop. First render, non-easing states, and non-browser contexts (no
     *  requestAnimationFrame, e.g. tests/SSR) snap instantly. A viewport resize snaps
     *  too, matching the CSS transition the resize already suppresses. */
    $effect(() => {
        const target = baseFocus;
        const ease = easeFocus;
        const resizing = changed;
        const canAnimate = typeof requestAnimationFrame !== 'undefined';
        if (!focusStarted || !ease || resizing || !canAnimate) {
            focusStarted = true;
            lastFocusFrame = undefined;
            renderedBase = target;
            return;
        }
        if (focusRAF === undefined) focusRAF = requestAnimationFrame(stepFocus);
    });

    /** The camera actually rendered: the eased base with the audience's offset on top. */
    $effect(() => {
        renderedFocus = compose(renderedBase);
    });

    /** What bounds the audience's zoom right now: the camera they are looking at — the
     *  rendered one, not the one it may still be easing toward, since what has to hold
     *  instantly is that a gesture did something — and the nearest thing on stage. */
    let zoomLimits = $derived({
        baseZ: renderedBase.z,
        nearestContentZ: contentBounds.nearest,
    });

    /** Re-bound the stored zoom whenever the bound itself moves.
     *
     *  Bounding only when a gesture writes is not enough, because the ceiling is not a
     *  constant: it follows the base camera and the nearest content, and both move on their
     *  own. Leave the store above a ceiling that has since come down and `compose` still
     *  clamps the picture while the stored ratio does not — so the next scroll-out spends
     *  itself shedding a number nobody could see, and the toolbar reports a zoom the stage
     *  is not showing. That is the dead zone, in miniature, and this is what closes it.
     *
     *  Reads the offset untracked and writes only on a real change, so it cannot feed
     *  itself. */
    $effect(() => {
        const limits = zoomLimits;
        const current = untrack(() => offset);
        const bounded = boundZoom(limits, current.zoom);
        if (bounded !== current.zoom) offset = { ...current, zoom: bounded };
    });

    /** Mirror the adjustment out to the parent so the toolbar can reflect it. */
    $effect(() => {
        focusAdjusted = offset.x !== 0 || offset.y !== 0 || offset.zoom !== 1;
        zoom = offset.zoom;
    });

    /** Say the zoom level as the audience changes it, so a zoom is not silent. Not gated on
     *  playing: a zoom is the viewer's own action in every mode. The percent varies with
     *  every click by construction, which is what keeps the announcement audible — a
     *  coalesced announcement whose text repeats is heard once and then never again. */
    let announcedZoom: number | undefined = undefined;
    $effect(() => {
        const level = offset.zoom;
        // The first run is the initial state rather than an adjustment the viewer made.
        if (announcedZoom === undefined) {
            announcedZoom = level;
            return;
        }
        if (level === announcedZoom) return;
        announcedZoom = level;
        if (!interactive || mini || !$announcer) return;
        untrack(() =>
            $announcer?.(
                'stage-zoom',
                $locales.getLocale().language,
                $locales
                    .concretize((l) => l.ui.output.announce.zoom, {
                        percent: zoomPercent(level),
                    })
                    .toText(),
            ),
        );
    });

    /** Whether the audience's own adjustment has put the content out of view. Only their
     *  own: a creator whose content is genuinely tiny or off-origin gets no lecture, and
     *  gating this way is what guarantees the hint can never occlude content the viewer
     *  cannot uncover. */
    let contentOutOfView = $derived(
        focusAdjusted &&
            contentVisibility(
                contentBounds,
                renderedFocus,
                viewportWidth,
                viewportHeight,
            ) !== 'visible',
    );

    /** Hold before saying the content is gone, but restore the moment it is back: a pinch
     *  passes through hidden states on its way somewhere, and a hint that strobes is worse
     *  than one that arrives a beat late. */
    let hiddenTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
    $effect(() => {
        const hidden = contentOutOfView;
        if (hiddenTimeout !== undefined) {
            clearTimeout(hiddenTimeout);
            hiddenTimeout = undefined;
        }
        if (!hidden) {
            contentHidden = false;
            return;
        }
        hiddenTimeout = setTimeout(() => {
            hiddenTimeout = undefined;
            contentHidden = true;
        }, HiddenDelay);
    });

    onDestroy(() => {
        if (hiddenTimeout !== undefined) clearTimeout(hiddenTimeout);
    });

    /** Say when everything has left the stage, and say when it is back. Announcing *both*
     *  edges is what keeps this audible: the queued lane drops a repeat of the last thing
     *  it said, so an entry message alone would be heard once and then be silent forever. */
    let announcedHidden: boolean | undefined = undefined;
    $effect(() => {
        const hidden = contentHidden;
        const level = untrack(() => offset.zoom);
        if (announcedHidden === undefined) {
            announcedHidden = hidden;
            return;
        }
        if (hidden === announcedHidden) return;
        announcedHidden = hidden;
        if (!interactive || mini || !$announcer) return;
        untrack(() =>
            $announcer?.(
                'stage-visibility',
                $locales.getLocale().language,
                hidden
                    ? $locales
                          .concretize((l) => l.ui.output.announce.hidden, {
                              percent: zoomPercent(level),
                          })
                          .toText()
                    : $locales.getPrimaryPlainText(
                          (l) => l.ui.output.announce.shown,
                      ),
            ),
        );
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
    //
    // Gated on playing, matching OutputView's value announcements: a paused
    // stage is a preview of code the creator is reading with the caret and
    // echo announcements, and describing it talks over them — and over the
    // tutorial's dialogue, which mounts paused projects. Reading `speaking`
    // here makes it a dependency, so entering play mode re-runs this; the
    // animator is reset on that transition, so every output comes back as
    // newly entered and the stage describes itself once.
    $effect(() => {
        if ($announcer && speaking) {
            const language = $locales.getLocale().language;

            // An entered description can be undefined even with entries — a
            // stage holding only a Say has nothing left to describe — so fall
            // through to changed and moved rather than announcing nothing.
            const enteredDescription =
                entered.size > 0
                    ? describeEnteredOutput($locales, entered)
                    : undefined;
            if (enteredDescription !== undefined) {
                untrack(() =>
                    $announcer('stage-entered', language, enteredDescription),
                );
                return;
            }

            const changeDescription = describedChangedOutput(
                $locales,
                entered,
                present,
                previouslyPresent,
                // The container, so a change too big to list can be summarized
                // by what holds it rather than read out in full (#555).
                stage,
            );
            if (changeDescription) {
                untrack(() =>
                    $announcer('stage-changed', language, changeDescription),
                );
            } else if (moved.size > 0) {
                const moveDescription = describeMovedOutput($locales, moved);
                if (moveDescription !== '')
                    untrack(() =>
                        $announcer('stage-moved', language, moveDescription),
                    );
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
        class:readonly={!editable}
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
        style:background={background ? stage.back.toCSS(adapting) : null}
        style:color={getColorCSS(
            stage.getFirstRestPose(),
            stage.pose,
            adapting,
        )}
        style:opacity={getOpacityCSS(stage.getFirstRestPose(), stage.pose)}
        style:--grid-color={renderedBack.contrasting().toCSS()}
        style:color-scheme={scheme}
        bind:this={view}
    >
        <!-- The light show tints the stage beneath its output, when the
             viewer has chosen it and there's music to show. -->
        {#if $musicVisualization === 'lightshow' && musicNames.length > 0}
            <LightShow names={musicNames} />
        {/if}
        <!-- The mood cloud gathers on the floor beneath the output, for the
             same reason: a creator's work is never covered by a rendering
             they didn't ask for. It takes the music itself rather than its
             names, since its character comes from reading the notes. -->
        {#if $musicVisualization === 'mood' && stageMusic.length > 0}
            <Mood musics={stageMusic} />
        {/if}
        <!-- The staff sits under the output too. It takes the evaluator as
             well as the music, because a scrolling score needs the playhead,
             and only that evaluator's player knows where it is. -->
        {#if $musicVisualization === 'sheet' && stageMusic.length > 0}
            <Sheet musics={stageMusic} {evaluator} />
        {/if}
        <!-- The orchestra sits on the floor of the stage rather than in the
             content flow, so it never pushes the creator's output around. -->
        {#if stageMusic.length > 0}
            <MusicView musics={stageMusic} />
        {/if}
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
            {#if showGrid}
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
                <!-- Render a grid if this is the root and the grid is on, or something
                     is being moved and wants the reference. Apply the same transform
                     that we do the the verse. `faint` is the moving-only grid, which
                     is a reference rather than something anything snaps to. -->
                {#each range(left, right) as number}
                    {@const left =
                        number * PX_PER_METER - HalfGridlineThickness}
                    <div
                        class="gridline vertical"
                        class:faint={!grid}
                        style:left="{left}px"
                        style:top="{-top * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:height="{Math.abs(top - bottom) * PX_PER_METER}px"
                    ></div>
                    {#if number !== 0 && grid}
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
                        class:faint={!grid}
                        style:top="{top}px"
                        style:left="{left * PX_PER_METER -
                            HalfGridlineThickness}px"
                        style:width="{Math.abs(left - right) * PX_PER_METER}px"
                    ></div>
                    {#if grid}
                        <div class="coordinate horizontal" style:top="{top}px"
                            >{number}m</div
                        >
                    {/if}
                {/each}
                <!-- The lattice a move actually snaps to is half a metre, so while
                     something is moving, show the lines between the labelled ones. -->
                {#if grid && moving}
                    {#each range(left, right - 1) as number}
                        <div
                            class="gridline vertical faint"
                            style:left="{(number + HALF_GRID) * PX_PER_METER -
                                HalfGridlineThickness}px"
                            style:top="{-top * PX_PER_METER -
                                HalfGridlineThickness}px"
                            style:height="{Math.abs(top - bottom) *
                                PX_PER_METER}px"
                        ></div>
                    {/each}
                    {#each range(bottom, top - 1) as number}
                        <div
                            class="gridline horizontal faint"
                            style:top="{-(number + HALF_GRID) * PX_PER_METER -
                                HalfGridlineThickness}px"
                            style:left="{left * PX_PER_METER -
                                HalfGridlineThickness}px"
                            style:width="{Math.abs(left - right) *
                                PX_PER_METER}px"
                        ></div>
                    {/each}
                {/if}
                <div
                    class="gridline horizontal axis"
                    class:faint={!grid}
                    style:top="0px"
                    style:left="{left * PX_PER_METER - HalfGridlineThickness}px"
                    style:width="{Math.abs(left - right) * PX_PER_METER}px"
                ></div>
                <div
                    class="gridline vertical axis"
                    class:faint={!grid}
                    style:left="0px"
                    style:top="{-top * PX_PER_METER - HalfGridlineThickness}px"
                    style:height="{Math.abs(top - bottom) * PX_PER_METER}px"
                ></div>
            {/if}
            <!-- What the output being moved is currently lined up with (#117).
                 Drawn here, inside the root group, so it inherits the camera
                 transform the output itself gets: a metre is PX_PER_METER pixels
                 and y is negated, with no camera arithmetic of its own. Purely
                 decorative — the constraint is announced, not read from here. -->
            {#each guides as guide, index (index)}
                {@const from =
                    (guide.span.from - GUIDE_OVERSHOOT) * PX_PER_METER}
                {@const to = (guide.span.to + GUIDE_OVERSHOOT) * PX_PER_METER}
                <div
                    class="guide {guide.axis === 'x'
                        ? 'vertical'
                        : 'horizontal'}"
                    class:grid={guide.target === undefined}
                    aria-hidden="true"
                    style:left={guide.axis === 'x'
                        ? `${guide.position * PX_PER_METER}px`
                        : `${from}px`}
                    style:top={guide.axis === 'x'
                        ? `${-to}px`
                        : `${-guide.position * PX_PER_METER}px`}
                    style:width={guide.axis === 'x' ? null : `${to - from}px`}
                    style:height={guide.axis === 'x' ? `${to - from}px` : null}
                ></div>
            {/each}
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
                 world content and rendered flat (screen-fixed, no camera/z).
                 Exposed to assistive tech rather than hidden: a HUD is where a
                 project puts its score, its status, and its controls, and no
                 describer covers it — StageView's announcements walk the stage
                 content, which consciously skips the overlay. Hiding it also put
                 any selectable HUD output behind an aria-hidden ancestor, which
                 is both unreachable and an axe violation. -->
            <section
                class="stage overlay-layer {interactive && !editing
                    ? 'live'
                    : 'inert'}"
                data-id={overlayStage.getHTMLID()}
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
        /* The stage is a drag surface (pan, and moving output while paused), so
           a drag across it must not start a text selection. Read-only stages
           never drag or pan — the whole block is gated on `editable` in
           OutputView — so there is nothing to compete with there, and their
           phrase text opts back in (see PhraseView). */
        user-select: none;
        -webkit-user-select: none;
        position: relative;
        flex-grow: 1;

        /* The scheme is declared inline from the background actually painted
           (see `scheme`), not from the app's, so the fallbacks below resolve
           against the canvas a creator made rather than the UI around it. */
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
        /* Labels are text, so they need WCAG AA 4.5:1 contrast: the
           contrasting() black/white at 0.6 is ~5.7:1 on white and ~8.6:1 on
           black, where the 0.5 the gridlines use falls short (~3.9:1). */
        opacity: 0.6;
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

    /* The grid shown only because something is being moved. Dimmer than the
       creator's own grid, since it's a reference rather than something the
       move is snapping to. */
    .gridline.faint {
        opacity: 0.08;
    }

    .axis.faint {
        opacity: 0.2;
    }

    /* What the moved output is lined up with. z-index 1 puts it over the output
       it relates (which the children snippet renders after this one) while
       leaving it under the rotate/resize handles, which are interactive. */
    .guide {
        position: absolute;
        background-color: var(--wordplay-highlight-color);
        pointer-events: none;
        z-index: 1;
    }

    /* A grid line the move landed on is already drawn; this just lights it up. */
    .guide.grid {
        background-color: var(--grid-color);
        opacity: 0.7;
    }
</style>
