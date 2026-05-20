<!-- Renders output, and output only -->
<script lang="ts">
    import OutputView from '@components/output/OutputView.svelte';
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
        evaluator = new Evaluator(project, DB, $locales.getLocales());
        evaluator.observe(update);
        // Start now only if there's nothing waiting on user consent; otherwise
        // the splash in OutputView will trigger a start once consent is granted.
        if (pendingPermissions.size === 0) evaluator.start();
    }

    /** Re-instantiate the evaluator whenever the project changes. */
    $effect(() => {
        project;
        untrack(() => instantiateEvaluator());
    });

    /** Once all required permissions are granted, start the evaluator if it hasn't already. */
    $effect(() => {
        if (
            evaluator !== undefined &&
            pendingPermissions.size === 0 &&
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
    />
{/if}
