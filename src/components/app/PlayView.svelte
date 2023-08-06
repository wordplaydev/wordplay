<!-- Renders output, and output only -->
<script lang="ts">
    import type Project from '@models/Project';
    import OutputView from '@components/output/OutputView.svelte';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { onMount } from 'svelte';

    export let project: Project;
    export let fit: boolean = true;

    function update() {
        latest = evaluator.getLatestSourceValue(project.main);
    }
    // Clone the project and get its initial value, then stop the project's evaluator.
    let evaluator: Evaluator = new Evaluator(project);
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
    source={project.main}
    value={latest}
    fullscreen={false}
    {fit}
    grid={false}
/>
