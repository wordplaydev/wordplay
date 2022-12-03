<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Evaluation from "../runtime/Evaluation";
    import type Evaluator from "../runtime/Evaluator";
    import type Step from "../runtime/Step";
    import EvaluationView from "./EvaluationView.svelte";

    export let evaluator: Evaluator;

    $: languages = getLanguages();

    let step: Step | undefined;
    let previousEvaluator = evaluator;
    let evaluations: Evaluation[] = [];
    $: {
        previousEvaluator?.ignore(handleUpdate);
        evaluator?.observe(handleUpdate);
        handleUpdate();
    }

    function handleUpdate() { 
        step = evaluator.getCurrentStep();
        evaluations = evaluator.evaluations;
    }


</script>

<section class="evaluator">

    <p>{step?.getExplanations(evaluator)[$languages[0]]}</p>

    {#each evaluations as evaluation}
        <EvaluationView evaluation={evaluation} />
    {/each}

</section>

<style>
    section {
        padding: var(--wordplay-spacing);
    }
</style>