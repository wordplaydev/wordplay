<!-- Renders output, and output only -->
<script lang="ts">
    import type Project from '@db/projects/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { DB, locales } from '../../db/Database';
    import { untrack } from 'svelte';

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
    $effect(() => {
        untrack(() => {
            if (evaluator) {
                evaluator.stop();
                evaluator.ignore(update);
            }
        });
        evaluator = new Evaluator(project, DB, $locales.getLocales());
        untrack(() => {
            if (evaluator) {
                evaluator.observe(update);
                evaluator.start();
            }
        });
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
    />
{/if}
