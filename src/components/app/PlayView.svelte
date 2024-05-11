<!-- Renders output, and output only -->
<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { DB, locales } from '../../db/Database';

    export let project: Project;
    export let fit = true;

    function update() {
        latest = evaluator.getLatestSourceValue(project.getMain());
    }
    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator: Evaluator;
    let latest: Value | undefined = undefined;
    $: {
        evaluator = new Evaluator(project, DB, $locales);
        if (evaluator) {
            evaluator.stop();
            evaluator.ignore(update);
        }
        evaluator.observe(update);
        evaluator.start();
    }
</script>

<OutputView
    {project}
    {evaluator}
    value={latest}
    {fit}
    grid={false}
    editable={false}
/>
