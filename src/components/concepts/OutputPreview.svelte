<script module lang="ts">
    /** Only one OutputPreview plays at a time across the whole app (for performance and so
     *  two animations/sounds don't compete). When one starts, the previously-playing one is
     *  asked to stop via its `onStop`, which flips its parent's controlled `playing` to
     *  false. */
    let activePreview: { stop: () => void } | undefined = undefined;
</script>

<script lang="ts">
    import OutputView from '@components/output/OutputView.svelte';
    import StartGate from '@components/output/StartGate.svelte';
    import {
        ContentGate,
        getPhotosensitivityWarnings,
    } from '@components/output/gate.svelte';
    import {
        IdleKind,
        setAnimatingNodes,
        setEvaluation,
        setKeyboardEditIdle,
        setProject,
        setResetKeyboardIdle,
        setSelectedOutput,
    } from '@components/project/Contexts';
    import SelectedOutput from '@components/project/SelectedOutput.svelte';
    import Button from '@components/widgets/Button.svelte';
    import {
        makeExampleProject,
        makePreviewEvaluator,
    } from '@components/concepts/previewEvaluator';
    import { DB, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import type Example from '@nodes/Example';
    import type Node from '@nodes/Node';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import ValueView from '@components/values/ValueView.svelte';
    import Group from '@output/Output/Group';
    import type Output from '@output/Output/Output';
    import Sequence from '@output/animation/Sequence';
    import Stage, { NameGenerator, toStage } from '@output/Output/Stage';
    import type Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { untrack, type Snippet } from 'svelte';
    import { writable } from 'svelte/store';

    interface Props {
        /** Self-contained mode: the example whose output to preview. */
        example?: Example | undefined;
        /** External mode: a project + evaluator the parent owns (and whose project-scoped
         *  contexts the parent already set, e.g. ExampleUI sharing its Editor's evaluator). */
        project?: Project | undefined;
        evaluator?: Evaluator | undefined;
        /** Whether the output is currently playing. Controlled by the parent so it can
         *  coordinate (e.g. one how-to plays at a time). */
        playing: boolean;
        onPlay: () => void;
        onStop: () => void;
        /** Rendered when the output isn't a Stage. When omitted, the value is shown via
         *  ValueView (ExampleUI's behavior); how-to tiles pass a code preview instead. */
        fallback?: Snippet;
        /** Show the corner play/stop button. Parents that render their own play
         *  control (e.g. ExampleUI) pass false to avoid a duplicate. */
        control?: boolean;
    }

    let {
        example = undefined,
        project: externalProject = undefined,
        evaluator: externalEvaluator = undefined,
        playing,
        onPlay,
        onStop,
        fallback,
        control = true,
    }: Props = $props();

    // Self-contained when the parent didn't hand us an evaluator.
    // svelte-ignore state_referenced_locally
    const selfContained = externalEvaluator === undefined;

    // A stable handle for the global single-play registry; stop() flips our parent's
    // controlled `playing` off (reading the latest onStop prop).
    const self = { stop: () => onStop() };

    // Build the self-contained project once. The example is stable for the tile's lifetime
    // (Documentation keys how-to tiles). Spacing is cosmetic, so synthesize preferred spaces.
    // svelte-ignore state_referenced_locally
    const ownProject =
        selfContained && example
            ? makeExampleProject(
                  'how',
                  example.program,
                  getPreferredSpaces(example.program),
                  $locales.getLocales(),
              )
            : undefined;
    // The self-contained evaluator. It starts non-reactive so the static first frame
    // evaluates without claiming the mic/camera; pressing play recreates it reactive
    // (see recreateOwn and makePreviewEvaluator's contract).
    // svelte-ignore state_referenced_locally
    let ownEvaluator = $state<Evaluator | undefined>(
        ownProject
            ? makePreviewEvaluator(ownProject, DB, $locales.getLocales(), false)
            : undefined,
    );

    // The project + evaluator in play: the parent's, or our own.
    let project = $derived(externalProject ?? ownProject);
    let evaluator = $derived(externalEvaluator ?? ownEvaluator);

    // Documentation/gallery previews are read-only, so gate their playback for
    // photosensitivity too, just like the main stage. Risks are found by static
    // analysis of the project (no frames painted). The gate holds `playing` (see
    // the play effect) until the viewer clicks Start.
    const photoWarnings = $derived(
        project
            ? getPhotosensitivityWarnings(project, DB, $locales.getLocales())
            : [],
    );
    const gate = new ContentGate(() => photoWarnings);

    let value: Value | undefined = $state(undefined);
    let stage: Stage | undefined = $state(undefined);
    /** Whether playing this preview would actually do anything: either the project
     *  references streams (temporal like Time, or input like Key/Pointer) so it reevaluates,
     *  or its output animates (resting sequences, entry/move/exit transitions, durations).
     *  Only then do we show the corner play/stop control. Computed from the first-frame evaluation. */
    let playable = $state(false);

    // Isolate the project-scoped contexts OutputView/StageView read, mirroring ExampleUI.
    // Only in self-contained mode — external callers set these above their own subtree.
    const projectStore = writable<Project | undefined>(undefined);
    // svelte-ignore state_referenced_locally
    const evaluation = writable(
        ownEvaluator ? getEvalContext(ownEvaluator) : undefined,
    );
    const animatingNodes = writable<Set<Node>>(new Set());
    if (selfContained) {
        setProject(projectStore);
        setEvaluation(evaluation);
        setAnimatingNodes(animatingNodes);
        setKeyboardEditIdle(writable(IdleKind.Idle));
        setResetKeyboardIdle(() => {});
        setSelectedOutput(new SelectedOutput());
    }
    $effect(() => {
        if (selfContained) projectStore.set(project);
    });

    function getEvalContext(e: Evaluator) {
        return {
            evaluator: e,
            playing: e.isPlaying(),
            step: e.getCurrentStep(),
            stepIndex: e.getStepIndex(),
            streams: e.reactions,
        };
    }

    function update() {
        if (evaluator && project) {
            value = evaluator.getLatestSourceValue(project.getMain());
            stage = value
                ? toStage(evaluator, value, new NameGenerator())
                : undefined;
        }
    }

    function updateEvaluatorStores() {
        if (selfContained && evaluator)
            evaluation.set(getEvalContext(evaluator));
    }

    /** True if any output in the tree animates (recursing through Group/Stage children).
     *  Like Output.isAnimated() but ignores the default transition `duration` (every output
     *  carries 0.25s), which would otherwise match every preview — we want only explicit
     *  entry/move/exit transitions or a looping resting sequence. */
    function anyAnimated(output: Output | null): boolean {
        if (output === null) return false;
        if (
            output.entering !== undefined ||
            output.resting instanceof Sequence ||
            output.moving !== undefined ||
            output.exiting !== undefined
        )
            return true;
        return (
            (output instanceof Group || output instanceof Stage) &&
            output.getOutput().some(anyAnimated)
        );
    }

    /** Recreate the self-contained evaluator in the given reactivity mode, but only when the
     *  mode actually changes. See makePreviewEvaluator for why reactivity switches require
     *  recreation and what each mode does. */
    function recreateOwn(reactive: boolean) {
        if (!selfContained || !ownProject) return;
        if (ownEvaluator && ownEvaluator.reactive === reactive) return;
        ownEvaluator?.stop();
        ownEvaluator = makePreviewEvaluator(
            ownProject,
            DB,
            $locales.getLocales(),
            reactive,
        );
    }

    /** Evaluate one frame and pause — the static preview frame. */
    function seedFirstFrame(e: Evaluator) {
        value = e.getInitialValue();
        stage = value ? toStage(e, value, new NameGenerator()) : undefined;
        playable =
            e.streamsByCreator.size > 0 ||
            (stage !== undefined && anyAnimated(stage));
        updateEvaluatorStores();
    }

    // Observe the current evaluator (re-subscribing if it's swapped out, e.g. ExampleUI
    // resetting its evaluator). update() keeps value/stage fresh; self-contained mode also
    // keeps its own evaluation context fresh.
    $effect(() => {
        const e = evaluator;
        if (!e) return;
        e.observe(update);
        if (selfContained) e.observe(updateEvaluatorStores);
        return () => {
            e.ignore(update);
            if (selfContained) e.ignore(updateEvaluatorStores);
        };
    });

    // Drive play/stop from the controlled `playing` prop. The whole evaluation body runs
    // untracked: playing or stopping broadcasts synchronously to our observers, which
    // read/write reactive state (value, stage, the evaluation store) — tracking any of that
    // here would re-invalidate this effect and loop. Only `playing` is a dependency.
    $effect(() => {
        // Hold playback while the photosensitivity gate is up.
        const p = playing && !gate.gated;
        untrack(() => {
            // Single-play: when we start, ask any other playing preview to stop; when we
            // stop, release the registry. The other's onStop schedules its effect (it won't
            // run synchronously here), so by then `activePreview` is already us.
            if (p) {
                if (activePreview && activePreview !== self)
                    activePreview.stop();
                activePreview = self;
            } else if (activePreview === self) {
                activePreview = undefined;
            }
            // Self-contained: switch the evaluator's reactivity so native streams start on
            // play and are released on stop. (External evaluators are the parent's to manage.)
            if (selfContained) recreateOwn(p);
            const e = selfContained ? ownEvaluator : externalEvaluator;
            if (!e) return;
            if (p) {
                // A freshly-recreated reactive evaluator hasn't evaluated yet, so start it
                // (evaluates, starts streams, and plays); an external one is already seeded,
                // so just resume it.
                if (selfContained) {
                    e.start();
                    update();
                    // Publish playing=true to the evaluation context so StageView's Animator
                    // actually starts (it's gated on $evaluation.playing).
                    updateEvaluatorStores();
                } else e.play();
            } else seedFirstFrame(e);
        });
    });

    // Reset acknowledgment when the previewed project changes (new example).
    $effect(() => {
        project;
        untrack(() => gate.reset());
    });

    // On unmount, stop our own evaluator and release the single-play registry if we held it.
    $effect(() => {
        return () => {
            if (activePreview === self) activePreview = undefined;
            if (selfContained && ownEvaluator) ownEvaluator.stop();
        };
    });
</script>

{#if stage && evaluator && project}
    <div class="output">
        <div class="stage">
            <OutputView
                {project}
                {evaluator}
                {value}
                grid
                editable={false}
                wheel={false}
                blurOnTyping={false}
            />
            {#if gate.gated}
                <StartGate
                    warnings={gate.pending}
                    blocks={[]}
                    onstart={gate.acknowledge}
                    mini
                />
            {/if}
        </div>
        <!-- A small corner control, only for projects that actually reevaluate or animate.
             It doesn't cover the stage, so stage clicks stay interactive while playing. -->
        {#if control && playable}
            <div class="control">
                <!-- A single Button (not a play/stop pair) so activating it with the
                     keyboard keeps focus: swapping in a different element would drop it. -->
                <Button
                    tip={(l) =>
                        playing
                            ? l.ui.timeline.button.reset
                            : l.ui.timeline.button.play}
                    icon={playing ? '⏹' : '▶'}
                    background={true}
                    action={playing ? onStop : onPlay}
                ></Button>
            </div>
        {/if}
    </div>
{:else if fallback}
    {@render fallback()}
{:else if value}
    <ValueView {value} inline={false} />
{/if}

<style>
    .output {
        position: relative;
        display: flex;
        width: 100%;
    }

    .stage {
        display: flex;
        width: 100%;
        aspect-ratio: 4 / 3;
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        overflow: hidden;
    }

    .control {
        position: absolute;
        inset-block-start: var(--wordplay-spacing-half);
        inset-inline-start: var(--wordplay-spacing-half);
    }
</style>
