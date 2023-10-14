<!-- Renders output, and output only -->
<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { onMount } from 'svelte';
    import { DB, locales } from '../../db/Database';

    export let project: Project;
    export let fit = true;

    function update() {
        latest = evaluator.getLatestSourceValue(project.getMain());
    }
    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator: Evaluator = new Evaluator(project, DB, $locales);
    let latest: Value | undefined = undefined;

    onMount(() => {
        evaluator.observe(update);
        evaluator.start();
        return () => {
            evaluator.stop();
            evaluator.ignore(update);
        };
    });
</script>

<OutputView
    {project}
    {evaluator}
    value={latest}
    {fit}
    grid={false}
    editable={false}
/>
