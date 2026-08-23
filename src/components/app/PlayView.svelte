<!-- Renders output, and output only -->
<script lang="ts">
    import OutputView from '@components/output/OutputView.svelte';
    import {
        ContentGate,
        getMusicWarnings,
        getPhotosensitivityWarnings,
    } from '@components/output/gate.svelte';
    import type Project from '@db/projects/Project';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { onDestroy, untrack } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import { DB, locales } from '@db/Database';
    import { consent, refreshConsentFromBrowser } from '@input/permissions';
    import {
        setEvaluation,
        type EvaluationContext,
    } from '@components/project/Contexts';

    interface Props {
        project: Project;
        fit?: boolean;
        /** Whether a plain wheel over the stage zooms it. On by default, as it
         *  is for the project's own stage. Hosts on a page that scrolls pass
         *  false: zooming calls preventDefault, so a wheel aimed at the page
         *  would be swallowed by whatever stage the pointer happened to be over. */
        wheel?: boolean;
    }

    let { project, fit = true, wheel = true }: Props = $props();

    // The tutorial's output is read-only, so gate it for photosensitivity and
    // music too, holding playback (like the permission gate) until the viewer
    // clicks Start.
    const contentWarnings = $derived([
        ...getPhotosensitivityWarnings(project, DB, $locales.getLocales()),
        ...getMusicWarnings(project, DB, $locales.getLocales()),
    ]);
    const gate = new ContentGate(() => contentWarnings);

    /**
     * The evaluation state OutputView reads to decide whether anything is playing. Without it,
     * `$evaluation` is undefined in this subtree and `playing` is permanently false — so music
     * never sounds and the "tap for sound" affordance, which is also gated on `playing`, never
     * appears to say why. ProjectView, OutputPreview, and ExampleUI all publish this; PlayView
     * is the one output host that didn't, which is what made every act title card silent.
     *
     * `mode` stays undefined, which Contexts documents as correct outside a ProjectView.
     */
    const evaluation = writable<EvaluationContext | undefined>(undefined);
    setEvaluation(evaluation as Writable<EvaluationContext>);

    /**
     * Published only when something step-relevant moved. `update()` runs on every evaluator
     * broadcast, which is every animation frame while playing, and each published context makes
     * OutputView re-run five derivations that each rebuild the whole stream array. Nothing
     * downstream of this store cares about a step index that hasn't changed, so don't say so
     * sixty times a second — the same reasoning as the step-decoupled context in Contexts.ts.
     */
    let published:
        | { evaluator: Evaluator; playing: boolean; stepIndex: number }
        | undefined;

    function publish() {
        if (evaluator === undefined) return;
        const playing = evaluator.isPlaying();
        const stepIndex = evaluator.getStepIndex();
        if (
            published !== undefined &&
            published.evaluator === evaluator &&
            published.playing === playing &&
            published.stepIndex === stepIndex
        )
            return;
        published = { evaluator, playing, stepIndex };
        evaluation.set({
            evaluator,
            playing,
            step: evaluator.getCurrentStep(),
            stepIndex,
            streams: evaluator.reactions,
        });
    }

    function update() {
        if (evaluator)
            latest = evaluator.getLatestSourceValue(project.getMain());
        publish();
    }
    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator = $state<Evaluator | undefined>();
    let latest: Value | undefined = $state(undefined);

    const pendingPermissions = $derived(
        new Set(
            [...project.getRequiredPermissions()].filter(
                (p) => $consent[p] === 'unknown',
            ),
        ),
    );

    /** Ask the browser whether permissions are already granted, so we can skip the splash. */
    $effect(() => {
        for (const permission of project.getRequiredPermissions()) {
            untrack(() => refreshConsentFromBrowser(permission));
        }
    });

    function instantiateEvaluator() {
        if (evaluator) {
            evaluator.stop();
            evaluator.ignore(update);
        }
        gate.reset();
        evaluator = new Evaluator(project, DB, $locales.getLocales());
        evaluator.observe(update);
        // Start now only if there's nothing waiting on user consent or a content
        // warning; otherwise the gate in OutputView starts it once cleared.
        if (pendingPermissions.size === 0 && !gate.gated) evaluator.start();
        publish();
    }

    /** Re-instantiate the evaluator whenever the project changes. */
    $effect(() => {
        project;
        untrack(() => instantiateEvaluator());
    });

    /** Once permissions are granted and content warnings acknowledged, start the evaluator if it hasn't already. */
    $effect(() => {
        if (
            evaluator !== undefined &&
            pendingPermissions.size === 0 &&
            !gate.gated &&
            !evaluator.isStarted()
        ) {
            evaluator.start();
            publish();
        }
    });

    /**
     * Stop the evaluator when this view goes away — not only when its project changes.
     *
     * The tutorial destroys and rebuilds this component on every step, and an evaluator that is
     * never stopped keeps re-arming `tick()` on every animation frame for the life of the page
     * (`Evaluator.tick`: `if (this.reactive && !this.#stopped) this.later(...)`). Any title card
     * with a temporal stream — the falling cast, the raining emoji, the microphone — therefore
     * left a full program re-evaluating forever behind each visit, which is what made paging
     * through the tutorial get slower and slower and eventually took the tab down.
     */
    onDestroy(() => {
        evaluator?.ignore(update);
        evaluator?.stop();
    });
</script>

{#if evaluator}
    <OutputView
        {project}
        {evaluator}
        value={latest}
        source={project.getMain()}
        {fit}
        {wheel}
        grid={false}
        editable={false}
        onretry={() => instantiateEvaluator()}
        warnings={gate.pending}
        onacknowledge={gate.acknowledge}
    />
{/if}
