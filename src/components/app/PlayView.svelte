<!-- Renders output, and output only -->
<script lang="ts">
    import OutputView from '@components/output/OutputView.svelte';
    import {
        ContentGate,
        getPhotosensitivityWarnings,
    } from '@components/output/gate.svelte';
    import type Project from '@db/projects/Project';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { untrack } from 'svelte';
    import { DB, locales } from '@db/Database';
    import { consent, refreshConsentFromBrowser } from '@input/permissions';

    interface Props {
        project: Project;
        fit?: boolean;
    }

    let { project, fit = true }: Props = $props();

    // The tutorial's output is read-only, so gate it for photosensitivity too,
    // holding playback (like the permission gate) until the viewer clicks Start.
    const photoWarnings = $derived(
        getPhotosensitivityWarnings(project, DB, $locales.getLocales()),
    );
    const gate = new ContentGate(() => photoWarnings);

    function update() {
        if (evaluator)
            latest = evaluator.getLatestSourceValue(project.getMain());
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
        )
            evaluator.start();
    });
</script>

{#if evaluator}
    <OutputView
        {project}
        {evaluator}
        value={latest}
        {fit}
        grid={false}
        editable={false}
        onretry={() => instantiateEvaluator()}
        warnings={gate.pending}
        onacknowledge={gate.acknowledge}
    />
{/if}
